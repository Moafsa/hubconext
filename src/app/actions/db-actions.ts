"use server";

import { createAsaasCustomer, createAsaasPayment } from "@/services/asaas";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { analyzeChatAndUpdateContent, generateContract } from "./ai-actions";
import { deleteObjectByKey } from "./upload-actions";
import { prisma } from "@/lib/prisma";

/** Garante que o usuário logado pode acessar o projeto (admin global ou usuário da mesma agência). */
async function requireProjectAccess(projectId: string) {
  const session = await getServerSession(authOptions);
  const u = session?.user as any;
  if (!u?.id) throw new Error("Não autenticado.");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, agencyId: true },
  });
  if (!project) throw new Error("Projeto não encontrado.");

  if (u.role === "CONEXT_ADMIN") return { user: u, project };
  if ((u.role === "AGENCY_USER" || u.role === "AGENCY_ADMIN") && u.agencyId && u.agencyId === project.agencyId) {
    return { user: u, project };
  }
  throw new Error("Sem permissão para este projeto.");
}

/**
 * CONFIGURAÇÕES GLOBAIS (CONEXT MASTER)
 */
export async function getGlobalConfig() {
  try {
    return await prisma.systemConfig.findUnique({
      where: { id: "master" }
    });
  } catch (error) {
    console.error("Erro ao buscar global config:", error);
    return null;
  }
}

export async function updateGlobalConfig(data: { 
  platformName?: string, 
  primaryColor?: string, 
  logoUrl?: string, 
  openaiApiKey?: string,
  smtpHost?: string,
  smtpPort?: number,
  smtpUser?: string,
  smtpPass?: string,
  smtpFrom?: string,
  uzapiInstanceId?: string,
  uzapiToken?: string
}) {
  try {
    const config = await prisma.systemConfig.upsert({
      where: { id: "master" },
      update: data,
      create: {
        id: "master",
        platformName: data.platformName || "Conext Hub",
        primaryColor: data.primaryColor || "#3b82f6",
        ...data
      }
    });

    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { success: true, config };
  } catch (error: any) {
    console.error("ERRO CRÍTICO UPDATE GLOBAL:", error);
    return { success: false, error: error.message };
  }
}

async function refreshGlobalUzapiTokenIfNeeded() {
  const config = await prisma.systemConfig.findUnique({ where: { id: "master" } });
  if (!config || !config.uzapiInstanceId) return config;

  const list = await WhatsAppService.adminListUsers();
  if (!list.success || !list.users) return config;

  const candidates = list.users.filter((u: any) => u?.name === config.uzapiInstanceId);
  const logged = candidates.find((u: any) => u?.loggedIn === true) || candidates.find((u: any) => u?.connected === true);

  if (logged?.token && logged.token !== config.uzapiToken) {
    await prisma.systemConfig.update({
      where: { id: "master" },
      data: { uzapiToken: logged.token },
    });
    return { ...config, uzapiToken: logged.token };
  }

  if (logged?.token) return { ...config, uzapiToken: logged.token };

  return config;
}

export async function connectGlobalWhatsAppInstance() {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { id: "master" } });
    if (!config) throw new Error("Configuração master não encontrada.");

    if (config.uzapiToken) {
      const { qr, status, loggedIn } = await WhatsAppService.getQrCode(config.uzapiToken);
      if (qr) return { success: true, qr };
      if (loggedIn) return { success: true, connected: true };
      
      if (status === 401) {
        await prisma.systemConfig.update({
          where: { id: "master" },
          data: { uzapiToken: null, uzapiInstanceId: null }
        });
      }
    }

    const name = `master_admin`;
    const result = await WhatsAppService.createInstance(name);
    
    if (result.success && result.token) {
      await prisma.systemConfig.update({
        where: { id: "master" },
        data: { uzapiInstanceId: name, uzapiToken: result.token }
      });
      
      for (let attempt = 0; attempt < 6; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const { qr, status, loggedIn } = await WhatsAppService.getQrCode(result.token);
        if (qr) return { success: true, qr };
        if (loggedIn) return { success: true, connected: true };
      }

      throw new Error("A instância foi criada, mas o QR Code ainda não ficou disponível.");
    }

    throw new Error(result.error || "Falha ao criar instância.");
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getGlobalWhatsAppConnectionStatus() {
  try {
    const config = await refreshGlobalUzapiTokenIfNeeded();
    if (!config) throw new Error("Configuração master não encontrada.");
    if (!config.uzapiToken) return { success: true, connected: false, loggedIn: false };

    const status = await WhatsAppService.getStatus(config.uzapiToken);
    return { success: true, connected: status.connected, loggedIn: status.loggedIn };
  } catch (error: any) {
    return { success: false, error: error.message, connected: false, loggedIn: false };
  }
}

/**
 * FILE ACTIONS
 */
export async function saveFileReference(projectId: string, filename: string, minioKey: string, fileType: string, sizeBytes: number = 0) {
  try {
    await requireProjectAccess(projectId);
    const fileRecord = await prisma.file.create({
      data: { filename, minioKey, fileType, sizeBytes, projectId }
    });
    
    // Registrar na Timeline
    await addProjectHistory(projectId, `Novo arquivo detectado: ${filename}`);
    
    return { success: true, file: fileRecord };
  } catch (error: any) {
    console.error("Erro ao salvar referência no BD:", error);
    return { success: false, error: "Falha ao gravar arquivo." };
  }
}

export async function deleteProjectFile(fileId: string, userName: string) {
  try {
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new Error("Arquivo não encontrado.");
    await requireProjectAccess(file.projectId);

    await prisma.file.delete({ where: { id: fileId } });

    // Best-effort: apagar do MinIO (não falha a operação se o storage falhar)
    try {
      await deleteObjectByKey(file.minioKey);
    } catch {}

    await addProjectHistory(
      file.projectId,
      "Arquivo Removido",
      `O Admin/Agência (${userName}) removeu o arquivo: ${file.filename}`,
    );

    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * PROJECT ACTIONS
 */
// Helper para limpar objetos JSON para o Prisma (Prisma não aceita undefined em campos Json)
function sanitizeJson(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj ?? null;
  if (Array.isArray(obj)) return obj.map(sanitizeJson);
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      newObj[key] = val === undefined ? null : sanitizeJson(val);
    }
  }
  return newObj;
}

export async function createProject(data: any) {
  console.log("[createProject] Operação Atômica e Robusta Iniciada...");
  try {
    const { 
        title, description, type, clientName, clientEmail, 
        clientWhatsapp,
        proposedPrice, agencyId, suggestedTech, technicalScope, 
        contractText, credentials, briefing 
    } = data;

    if (!agencyId) throw new Error("AgencyID inválido.");
    if (!clientEmail) throw new Error("E-mail do cliente obrigatório.");

    // 1. Garantir Cliente
    // Normaliza WhatsApp (E.164 sem '+') para aumentar entrega no Wuzapi
    const normalizedWhatsapp = clientWhatsapp ? WhatsAppService.normalizePhone(clientWhatsapp) : "";
    const whatsappToStore = normalizedWhatsapp ? normalizedWhatsapp : (clientWhatsapp || null);
    let client = await prisma.client.findFirst({ where: { email: clientEmail } });
    if (!client) {
        client = await prisma.client.create({
            data: { name: clientName || "Cliente Final", email: clientEmail, whatsapp: whatsappToStore, agencyId: agencyId }
        });
    } else if (clientWhatsapp && !client.whatsapp) {
        await prisma.client.update({ where: { id: client.id }, data: { whatsapp: whatsappToStore } });
    }

    // 2. Sanitização e Mapeamento Cirúrgico
    const validTypes = ["WEBSITE", "LANDING_PAGE", "SYSTEM", "AUTOMATION", "LOGO", "OTHER"];
    const verifiedType = validTypes.includes(type) ? type : "WEBSITE";
    const cleanedBriefing = sanitizeJson(briefing || {});

    // Mapeamento MANUAL para garantir integridade absoluta
    const project = await prisma.project.create({
      data: {
        title: String(title || "Novo Projeto"),
        description: String(description || "Sem descrição."),
        type: verifiedType,
        status: "UNDER_REVIEW",
        proposedPrice: Number(proposedPrice) || 0,
        agencyId: String(agencyId),
        clientId: String(client.id),
        suggestedTech: suggestedTech ? String(suggestedTech) : "",
        technicalScope: technicalScope ? String(technicalScope) : "",
        contractText: contractText ? String(contractText) : "",
        credentials: credentials ? String(credentials) : "",
        briefing: cleanedBriefing
      }
    });

    console.log("[createProject] Sucesso na Gravação Atômica! ID:", project.id);

    // 3. Registrar Histórico Base
    try {
      await addProjectHistory(project.id, "Projeto Criado", "Dados iniciais e briefing consolidados via Mago.");
    } catch (hErr) { console.error("Erro no histórico:", hErr); }

    // 4. Arquivos
    const wizardFiles = briefing?.wizardFiles || [];
    if (wizardFiles && Array.isArray(wizardFiles) && wizardFiles.length > 0) {
      for (const file of wizardFiles) {
        try {
          await prisma.file.create({
            data: {
              filename: file.name || "Arquivo",
              minioKey: file.key,
              fileType: file.type || "unknown",
              sizeBytes: Number(file.size) || 0,
              projectId: project.id
            }
          });
        } catch (fErr) { console.error("Erro ao vincular arquivo:", fErr); }
      }
    }

    revalidatePath("/dashboard/projects");
    return { success: true, id: project.id };
  } catch (error: any) {
    console.error("[createProject] ERRO CRÍTICO NA GRAVAÇÃO:", error);
    return { success: false, error: String(error.message || error) };
  }
}

export async function getProjects(agencyId?: string | null) {
  try {
    const where = agencyId ? { agencyId } : {};
    return await prisma.project.findMany({
      where,
      include: { agency: true, client: true, files: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Erro ao buscar projetos:", error);
    return [];
  }
}

export async function getProjectInfo(projectId: string) {
  try {
    return await prisma.project.findUnique({
      where: { id: projectId },
      include: { 
        agency: true, 
        client: true, 
        files: true,
        comments: { include: { user: true }, orderBy: { createdAt: 'asc' } },
        histories: { orderBy: { createdAt: 'desc' } },
        snapshots: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'asc' } }
      }
    });
  } catch (error) {
    console.error("Erro ao buscar info do projeto:", error);
    return null;
  }
}

/**
 * ADMIN & AGENCY FLOW ACTIONS
 */
export async function updateProjectAIContent(
  projectId: string, 
  data: { technicalScope?: string, contractText?: string, description?: string },
  userId: string,
  userName: string
) {
  try {
    const { user } = await requireProjectAccess(projectId);
    const isAdmin = user.role === "CONEXT_ADMIN";

    const payload: { technicalScope?: string; contractText?: string, description?: string } = {};
    if (typeof data.technicalScope === "string") payload.technicalScope = data.technicalScope;
    if (typeof data.description === "string") payload.description = data.description;
    
    if (isAdmin && typeof data.contractText === "string") payload.contractText = data.contractText;
    if (!isAdmin && data.contractText !== undefined) {
      throw new Error("Apenas administradores podem editar o contrato.");
    }
    
    if (Object.keys(payload).length === 0) {
      throw new Error("Nada para salvar.");
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: payload
    });

    const fields = [];
    if (payload.technicalScope !== undefined) fields.push("Escopo Técnico");
    if (payload.contractText !== undefined) fields.push("Contrato");
    if (payload.description !== undefined) fields.push("Contexto da Agência");

    const who = isAdmin ? "Admin" : "Agência";
    await addProjectHistory(
      projectId, 
      `Alteração de Conteúdo`, 
      `${who} (${userName}) alterou: ${fields.join(" e ")}.`
    );

    revalidatePath("/dashboard/projects");
    return { success: true, project };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveProject(projectId: string, userName: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true, agency: true }
    });

    if (!project) throw new Error("Projeto não encontrado.");

    const contractText = await generateContract({
      title: project.title,
      clientName: project.agency?.name || project.client.name,
      proposedPrice: Number(project.proposedPrice) || 0,
      agencyName: project.agency?.name,
      agencyCnpj: project.agency?.cnpj,
      agencyLegalName: (project.agency as any)?.legalName,
      agencyPhone: (project.agency as any)?.phone,
      agencyResponsibleName: (project.agency as any)?.responsibleName,
      agencyAddress: [
        (project.agency as any)?.addressLine,
        (project.agency as any)?.addressDistrict,
        (project.agency as any)?.addressCity,
        (project.agency as any)?.addressState,
        (project.agency as any)?.addressZip,
      ]
        .filter(Boolean)
        .join(" - "),
      suggestedTech: project.suggestedTech || "",
      technicalScope: project.technicalScope || "",
      briefing: project.briefing || {}
    });

    await createProjectSnapshot(projectId);

    await prisma.project.update({
      where: { id: projectId },
      data: { 
        status: "AWAITING_AGENCY_ACCEPTANCE",
        contractText
      }
    });

    await addProjectHistory(
      projectId,
      "Revisão Concluída",
      `O Admin ${userName} aprovou o escopo e o contrato foi gerado para aceite da agência.`
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function acceptProjectContract(projectId: string, userName: string) {
  try {
    const { user } = await requireProjectAccess(projectId);
    const actorName = String(user?.name || userName || "Usuário");
    const actorPosition = String(user?.position || "").trim();
    const actorLabel = actorPosition ? `${actorName} (${actorPosition})` : actorName;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Projeto não encontrado.");

    const currentBriefing = (project.briefing && typeof project.briefing === "object") ? project.briefing : {};
    const briefing = {
      ...(currentBriefing as any),
      agencyAcceptedContractAt: new Date().toISOString(),
    };

    await prisma.project.update({
      where: { id: projectId },
      // Ao aceitar o contrato, liberamos a Conext para iniciar o desenvolvimento
      data: { status: "IN_DEVELOPMENT", briefing }
    });

    await addProjectHistory(
      projectId,
      "Contrato Aceito",
      `${actorLabel} aceitou o contrato formalmente. Desenvolvimento liberado para a Conext.`
    );

    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function acceptProjectBriefing(projectId: string, userName: string) {
  try {
    const { user } = await requireProjectAccess(projectId);
    const actorName = String(user?.name || userName || "Usuário");
    const actorPosition = String(user?.position || "").trim();
    const actorLabel = actorPosition ? `${actorName} (${actorPosition})` : actorName;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Projeto não encontrado.");

    const currentBriefing = (project.briefing && typeof project.briefing === "object") ? project.briefing : {};
    const briefing = {
      ...(currentBriefing as any),
      agencyAcceptedBriefingAt: new Date().toISOString(),
    };

    await prisma.project.update({
      where: { id: projectId },
      data: { briefing },
    });

    await addProjectHistory(
      projectId,
      "Briefing Aceito",
      `${actorLabel} aceitou o briefing do projeto.`,
    );

    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProjectBriefingData(projectId: string, briefing: any, userName: string) {
  try {
    const { user } = await requireProjectAccess(projectId);
    const isAdmin = user.role === "CONEXT_ADMIN";
    const cleaned = sanitizeJson(briefing || {});

    await prisma.project.update({
      where: { id: projectId },
      data: { briefing: cleaned }
    });

    const who = isAdmin ? "Admin" : "Agência";
    await addProjectHistory(
      projectId,
      "Alteração de Marcos/Briefing",
      `${who} (${userName}) atualizou o briefing ou materiais do projeto.`
    );

    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProjectTech(projectId: string, newTech: string, userName: string) {
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { suggestedTech: newTech },
    });

    await addProjectHistory(projectId, "Tecnologia Alterada", `O Admin (${userName}) alterou a tecnologia para: ${newTech}`);
    await addProjectComment(projectId, `🚨 ATENÇÃO: A tecnologia deste projeto foi alterada para: **${newTech}**. Use o botão de Sincronização para atualizar o escopo.`, null, false);

    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncProjectFromChat(projectId: string, userName: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        comments: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { dueDate: "asc" } },
        agency: true,
      },
    });

    if (!project) throw new Error("Projeto não encontrado.");

    const chatHistory = project.comments.map(c => 
      `${c.clientAuthorName || (c.userId ? "Equipe" : "Usuário")}: ${c.text}`
    ).join("\n");

    const installments = (project.payments || []).map((p) => ({
      amount: p.amount,
      dueDate: p.dueDate.toISOString(),
      status: p.status,
    }));

    const result = await analyzeChatAndUpdateContent({
      title: project.title,
      currentBriefing: project.briefing || {},
      currentScope: project.technicalScope || "",
      currentContract: project.contractText || "",
      chatHistory,
      suggestedTech: project.suggestedTech || "",
      proposedPrice: Number(project.proposedPrice) || 0,
      agreedPrice: project.agreedPrice ? Number(project.agreedPrice) : undefined,
      installments,
    });

    // Salvar Snapshot antes de atualizar
    await createProjectSnapshot(projectId);

    const updatedBriefing = {
      ...(result.updatedBriefing || project.briefing || {}),
      financial: {
        proposedPrice: Number(project.proposedPrice) || 0,
        agreedPrice: project.agreedPrice ? Number(project.agreedPrice) : null,
        installments,
        updatedAt: new Date().toISOString(),
      },
    };

    // Garante que o contrato sempre reflita os valores e parcelas atuais
    const regeneratedContract = await generateContract({
      title: project.title,
      clientName: project.agency?.name || "AGÊNCIA",
      proposedPrice: Number(project.proposedPrice) || 0,
      agreedPrice: project.agreedPrice ? Number(project.agreedPrice) : undefined,
      installments: project.payments || [],
      agencyName: project.agency?.name,
      agencyCnpj: project.agency?.cnpj,
      agencyLegalName: (project.agency as any)?.legalName,
      agencyPhone: (project.agency as any)?.phone,
      agencyResponsibleName: (project.agency as any)?.responsibleName,
      agencyAddress: [
        (project.agency as any)?.addressLine,
        (project.agency as any)?.addressDistrict,
        (project.agency as any)?.addressCity,
        (project.agency as any)?.addressState,
        (project.agency as any)?.addressZip,
      ]
        .filter(Boolean)
        .join(" - "),
      suggestedTech: project.suggestedTech || "",
      technicalScope: result.updatedScope || project.technicalScope || "",
      briefing: updatedBriefing,
    });

    await prisma.project.update({
      where: { id: projectId },
      data: {
        briefing: updatedBriefing,
        technicalScope: result.updatedScope,
        contractText: regeneratedContract,
      }
    });

    await addProjectHistory(projectId, "Sincronização IA", `Sincronizado por ${userName}. Escopo e Contrato atualizados via IA.`);
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProjectStatus(projectId: string, newStatus: any) {
  try {
    const { user } = await requireProjectAccess(projectId);
    const actorName = String(user?.name || "Usuário");
    const actorPosition = String(user?.position || "").trim();
    const actorLabel = actorPosition ? `${actorName} (${actorPosition})` : actorName;

    const project = await prisma.project.findUnique({ where: { id: projectId }, include: { agency: true } });
    if (!project) throw new Error("Projeto não encontrado.");

    if (newStatus === "WAITING_INITIAL_PAY") {
      const amount = (project.agreedPrice || project.proposedPrice || 0) / 2;
      if (amount <= 0) throw new Error("Valor do projeto inválido para cobrança.");

      let asaasId = project.agency.asaasCustomerId;
      if (!asaasId) {
        const customer = await createAsaasCustomer({ name: project.agency.name, cnpj: project.agency.cnpj, email: "financeiro@agencia.com.br" });
        if (customer) {
          await prisma.agency.update({ where: { id: project.agency.id }, data: { asaasCustomerId: customer.id } });
          asaasId = customer.id;
        }
      }

      if (asaasId) {
        const payment = await createAsaasPayment({ customerId: asaasId, value: amount, description: `50% entrada: ${project.title}` });
        if (payment) {
          await prisma.project.update({ where: { id: projectId }, data: { status: newStatus, asaasInvoice1Id: payment.id } });
          await addProjectHistory(projectId, "Status: Aguardando Pagamento", `Movido por ${actorLabel}. Fatura de 50% gerada no Asaas.`);
          return { success: true, message: "Fatura gerada no Asaas." };
        }
      }
    }

    await prisma.project.update({ where: { id: projectId }, data: { status: newStatus } });
    await addProjectHistory(projectId, `Status alterado para: ${newStatus}`, `Movido por ${actorLabel}.`);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProject(projectId: string) {
  try {
    const session = await getServerSession(authOptions);
    const u = session?.user as any;
    if (u?.role !== "CONEXT_ADMIN") throw new Error("Apenas administradores podem excluir projetos.");

    // Cascatas manuais se necessário (Arquivos, Comentários, Histórico)
    await prisma.comment.deleteMany({ where: { projectId } });
    await prisma.projectHistory.deleteMany({ where: { projectId } });
    await prisma.file.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * COMMENT & HISTORY ACTIONS
 */
export async function addProjectComment(
  projectId: string, 
  text: string, 
  userId?: string | null, 
  isVisibleToClient: boolean = false,
  clientAuthorName?: string | null
) {
  try {
    const comment = await prisma.comment.create({
      data: { 
        text, 
        projectId, 
        userId: userId || null, 
        isVisibleToClient,
        clientAuthorName
      }
    });

    // Revalidar caminhos para garantir que o chat atualize
    revalidatePath(`/p/${projectId}`);
    revalidatePath("/dashboard/projects");

    return { success: true, comment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addProjectHistory(projectId: string, action: string, details?: string) {
  try {
    return await prisma.projectHistory.create({
      data: { projectId, action, details }
    });
  } catch (error: any) {
    console.error("Falha ao registrar histórico:", error);
    return null;
  }
}

/**
 * VERSIONAMENTO (SNAPSHOTS)
 */

export async function createProjectSnapshot(projectId: string) {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Projeto não encontrado." };

    await prisma.projectSnapshot.create({
      data: {
        projectId,
        technicalScope: project.technicalScope,
        contractText: project.contractText,
        briefing: project.briefing || {}
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function restoreProjectSnapshot(snapshotId: string, userName: string) {
  try {
    const snapshot = await prisma.projectSnapshot.findUnique({
      where: { id: snapshotId }
    });

    if (!snapshot) throw new Error("Snapshot não encontrado.");

    // Salva o estado atual como uma "vaga" antes de restaurar a antiga
    await createProjectSnapshot(snapshot.projectId);

    await prisma.project.update({
      where: { id: snapshot.projectId },
      data: {
        technicalScope: snapshot.technicalScope,
        contractText: snapshot.contractText,
        briefing: snapshot.briefing || {}
      }
    });

    await addProjectHistory(snapshot.projectId, "Restauração de Versão", `O Admin (${userName}) restaurou uma versão anterior do projeto.`);

    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * GESTÃO FINANCEIRA V2
 */

export async function updateProjectPricing(projectId: string, pricing: { agreedPrice?: number }, userName: string) {
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { agreedPrice: pricing.agreedPrice }
    });

    await addProjectHistory(projectId, "Ajuste Financeiro", `O Admin (${userName}) atualizou o preço acordado para ${pricing.agreedPrice?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`);
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateInstallments(projectId: string, count: number, firstDueDate: string, userName: string) {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Projeto não encontrado.");

    const total = project.agreedPrice || project.proposedPrice || 0;
    if (total <= 0) throw new Error("O preço do projeto deve ser definido antes de gerar parcelas.");

    const amountPerInstallment = total / count;
    const startDate = new Date(firstDueDate);

    // Limpar pagamentos PENDENTES existentes
    await prisma.payment.deleteMany({
      where: { projectId, status: "PENDING" }
    });

    for (let i = 0; i < count; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);
        
        await prisma.payment.create({
            data: {
                projectId,
                amount: amountPerInstallment,
                dueDate,
                status: "PENDING"
            }
        });
    }

    await addProjectHistory(projectId, "Parcelamento Gerado", `O Admin (${userName}) gerou ${count} parcelas de ${amountPerInstallment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`);
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePaymentStatus(paymentId: string, status: string, userName: string) {
    try {
        const payment = await prisma.payment.update({
            where: { id: paymentId },
            data: { 
                status,
                paidAt: status === "PAID" ? new Date() : null
            }
        });

        await addProjectHistory(payment.projectId, "Status de Pagamento", `O Admin (${userName}) marcou uma parcela como ${status}.`);
        revalidatePath("/dashboard/projects");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * CLIENT ACTIONS
 */
export async function getClients(agencyId?: string) {
  const where = agencyId ? { agencyId } : {};
  return await prisma.client.findMany({ where, include: { _count: { select: { projects: true } } } });
}

export async function deleteClient(clientId: string) {
  try {
    // Buscar todos os projetos do cliente para deletar dependências
    const projects = await prisma.project.findMany({ where: { clientId } });
    for (const p of projects) {
      await deleteProject(p.id);
    }
    await prisma.client.delete({ where: { id: clientId } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateClient(
  clientId: string,
  data: { name?: string; email?: string; whatsapp?: string | null },
  userName: string,
) {
  try {
    const cleaned = {
      ...(data.name !== undefined ? { name: String(data.name) } : {}),
      ...(data.email !== undefined ? { email: String(data.email) } : {}),
      ...(data.whatsapp !== undefined ? { whatsapp: data.whatsapp ? String(data.whatsapp) : null } : {}),
    };

    const client = await prisma.client.update({
      where: { id: clientId },
      data: cleaned,
    });

    revalidatePath("/dashboard/clients");
    return { success: true, client };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * AGENCY ACTIONS
 */
export async function getAgencies() {
  try {
    return await prisma.agency.findMany({ include: { _count: { select: { projects: true } } } });
  } catch (error) {
    return [];
  }
}

export async function createAgency(data: {
  name: string;
  cnpj: string;
  responsibleName: string;
  responsibleEmail: string;
  responsiblePhone?: string;
}) {
  try {
    const { name, cnpj, responsibleName, responsibleEmail, responsiblePhone } = data;

    // 1. Validar unicidade de CNPJ
    const existingAgency = await prisma.agency.findUnique({ where: { cnpj } });
    if (existingAgency) {
      return { success: false, error: "CNPJ_ALREADY_EXISTS" };
    }

    // 2. Validar unicidade de E-mail
    const existingUser = await prisma.user.findUnique({ 
      where: { email: responsibleEmail.toLowerCase() } 
    });
    if (existingUser) {
      return { success: false, error: "EMAIL_ALREADY_EXISTS" };
    }

    // 3. Criação Atômica
    const result = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name,
          cnpj,
          responsibleName,
          responsibleEmail,
          responsiblePhone,
        }
      });

      const user = await tx.user.create({
        data: {
          name: responsibleName,
          email: responsibleEmail.toLowerCase(),
          role: "AGENCY_ADMIN",
          agencyId: agency.id,
          phone: responsiblePhone
        }
      });

      return { agency, user };
    });

    revalidatePath("/dashboard/agencies");
    return { success: true, agency: result.agency };
  } catch (error: any) {
    console.error("ERRO AO CRIAR AGÊNCIA:", error);
    return { success: false, error: error.message || "Erro interno ao criar agência." };
  }
}

export async function updateAgency(agencyId: string, data: {
  name?: string;
  cnpj?: string;
  responsibleName?: string;
  responsibleEmail?: string;
  responsiblePhone?: string;
}) {
  try {
    const updated = await prisma.agency.update({
      where: { id: agencyId },
      data: {
        name: data.name,
        cnpj: data.cnpj,
        responsibleName: data.responsibleName,
        responsibleEmail: data.responsibleEmail,
        responsiblePhone: data.responsiblePhone,
      }
    });

    // Se o e-mail do responsável mudou, precisamos atualizar o usuário admin também?
    // Por simplicidade, vamos atualizar apenas a agência por enquanto, 
    // ou podemos buscar o usuário com role AGENCY_ADMIN vinculado a esta agência.
    
    revalidatePath("/dashboard/agencies");
    return { success: true, agency: updated };
  } catch (error: any) {
    console.error("Erro ao atualizar agência:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAgency(agencyId: string) {
  try {
    // 1. Verificar se tem projetos vinculados
    const projectCount = await prisma.project.count({ where: { agencyId } });
    if (projectCount > 0) {
      throw new Error(`Não é possível excluir uma agência que possui ${projectCount} projetos. Delete os projetos primeiro.`);
    }

    // 2. Deletar em cascata manual (Usuários, Clientes, Agência)
    await prisma.$transaction([
      prisma.user.deleteMany({ where: { agencyId } }),
      prisma.client.deleteMany({ where: { agencyId } }),
      prisma.agency.delete({ where: { id: agencyId } }),
    ]);

    revalidatePath("/dashboard/agencies");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir agência:", error);
    return { success: false, error: error.message };
  }
}

export async function getAgencySettings(agencyId: string) {
  try {
    return await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { 
        id: true, 
        name: true, 
        cnpj: true,
        legalName: true,
        phone: true,
        responsibleName: true,
        responsibleEmail: true,
        responsiblePhone: true,
        addressLine: true,
        addressDistrict: true,
        addressCity: true,
        addressState: true,
        addressZip: true,
        primaryColor: true, 
        logoUrl: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPass: true,
        smtpFrom: true,
        uzapiInstanceId: true,
        uzapiToken: true
      }
    });
  } catch (error) {
    return null;
  }
}

export async function updateAgencySettings(agencyId: string, data: { 
  name?: string,
  cnpj?: string,
  legalName?: string,
  phone?: string,
  responsibleName?: string,
  responsibleEmail?: string,
  responsiblePhone?: string,
  addressLine?: string,
  addressDistrict?: string,
  addressCity?: string,
  addressState?: string,
  addressZip?: string,
  primaryColor?: string, 
  logoUrl?: string,
  smtpHost?: string,
  smtpPort?: number,
  smtpUser?: string,
  smtpPass?: string,
  smtpFrom?: string,
  uzapiInstanceId?: string,
  uzapiToken?: string
}) {
  try {
    const agency = await prisma.agency.update({ where: { id: agencyId }, data });
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/projects");
    return { success: true, agency };
  } catch (error) {
    return { success: false, error: "Erro ao atualizar." };
  }
}

export async function testSmtpConnection(agencyId: string, config: {
  host: string,
  port: number,
  user: string,
  pass: string,
  from: string
}) {
  try {
    return await MailService.testConnection(config);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * CLIENT PORTAL AUTH & OTP ACTIONS
 */
import { MailService } from "@/services/mail";
import { WhatsAppService } from "@/services/whatsapp";
import { createClientSession } from "@/lib/client-auth";

async function refreshAgencyUzapiTokenIfNeeded(agencyId: string) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency || !agency.uzapiInstanceId) return agency;

  const list = await WhatsAppService.adminListUsers();
  if (!list.success || !list.users) return agency;

  const candidates = list.users.filter((u: any) => u?.name === agency.uzapiInstanceId);
  const logged = candidates.find((u: any) => u?.loggedIn === true) || candidates.find((u: any) => u?.connected === true);

  // Sempre retorna o token "real" encontrado, mesmo que já esteja igual ao do DB
  if (logged?.token && logged.token !== agency.uzapiToken) {
    await prisma.agency.update({
      where: { id: agencyId },
      data: { uzapiToken: logged.token },
    });
    return { ...agency, uzapiToken: logged.token };
  }

  if (logged?.token) return { ...agency, uzapiToken: logged.token };

  return agency;
}

export async function requestOtp(projectId: string, channel: "whatsapp" | "email") {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true, agency: true }
    });

    if (!project) throw new Error("Projeto não encontrado.");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.client.update({
      where: { id: project.clientId },
      data: { otpCode: otp, otpExpiresAt: expiresAt }
    });

    const message = `Seu código de acesso ao portal do projeto no Conext Hub é: ${otp}`;
    
    if (channel === "whatsapp" && project.client.whatsapp) {
      // Garante que estamos usando o token realmente logado no Wuzapi (fonte de verdade = /admin/users)
      const refreshedAgency = await refreshAgencyUzapiTokenIfNeeded(project.agencyId);
      const token = refreshedAgency?.uzapiToken;

      if (token) {
        const st = await WhatsAppService.getStatus(token);
        if (!st.loggedIn) {
          throw new Error("WhatsApp da agência não está conectado no momento. Peça para a agência reconectar no painel de Configurações.");
        }
        const sent = await WhatsAppService.sendText(token, project.client.whatsapp, message);
        if (!sent.success) throw new Error(sent.error || "Falha ao enviar WhatsApp.");
      } else {
        throw new Error("Não encontrei nenhuma instância logada para a agência no Wuzapi. Abra Configurações da Agência e reconecte o WhatsApp (QR).");
      }
    } else if (channel === "email") {
      if (project.agency.smtpHost) {
        const mailConfig = {
          host: project.agency.smtpHost,
          port: project.agency.smtpPort || 587,
          user: project.agency.smtpUser || "",
          pass: project.agency.smtpPass || "",
          from: project.agency.smtpFrom || undefined
        };
        const mailResult = await MailService.sendMail(mailConfig, project.client.email, "Seu Código de Acesso", `<p>${message}</p>`);
        if (!mailResult.success) {
          throw new Error(mailResult.error || "Falha ao enviar e-mail de verificação.");
        }
      } else {
        throw new Error("Agência não configurou E-mail.");
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjectWhatsAppStatus(projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { agency: true },
    });
    if (!project) throw new Error("Projeto não encontrado.");
    const refreshed = await refreshAgencyUzapiTokenIfNeeded(project.agencyId);
    if (!refreshed?.uzapiToken) return { success: true, available: false, loggedIn: false, connected: false };

    const st = await WhatsAppService.getStatus(refreshed.uzapiToken);
    return { success: true, available: true, loggedIn: st.loggedIn, connected: st.connected };
  } catch (error: any) {
    return { success: false, error: error.message, available: false, loggedIn: false, connected: false };
  }
}

export async function verifyOtp(projectId: string, code: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true }
    });

    if (!project) throw new Error("Projeto não encontrado.");

    if (project.client.otpCode === code && project.client.otpExpiresAt && project.client.otpExpiresAt > new Date()) {
      // Limpar OTP
      await prisma.client.update({
        where: { id: project.clientId },
        data: { otpCode: null, otpExpiresAt: null }
      });

      // Gerar Sessão
      await createClientSession(projectId, project.clientId);

      return { success: true };
    }

    throw new Error("Código inválido ou expirado.");
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * WHATSAPP INSTANCE ACTIONS
 */
export async function connectWhatsAppInstance(agencyId: string) {
  try {
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new Error("Agência não encontrada.");

    // Se já tiver uma instância, tenta pegar o QR
    if (agency.uzapiToken) {
      console.log(`Tentando recuperar QR para agência ${agencyId}...`);
      const { qr, status, loggedIn } = await WhatsAppService.getQrCode(agency.uzapiToken);
      if (qr) return { success: true, qr };

      // Se já estiver logado, não deve pedir QR nem recriar instância
      if (loggedIn) {
        return { success: true, connected: true };
      }
      
      if (status === 401) {
        console.warn("Token expirado ou inválido no Wuzapi (401). Resetando configuração local para recriar.");
        await prisma.agency.update({
          where: { id: agencyId },
          data: { uzapiToken: null, uzapiInstanceId: null }
        });
        // Continua para o fluxo de criação abaixo
      } else {
        console.warn(`QR Code não encontrado (Status ${status}). Tentando recriar ou aguardar.`);
      }
    }

    // Criar nova instância
    const name = `agency_${agencyId.substring(0, 8)}`;
      const result = await WhatsAppService.createInstance(name);
    
    if (result.success && result.token) {
      await prisma.agency.update({
        where: { id: agencyId },
        data: { uzapiInstanceId: name, uzapiToken: result.token }
      });
      
      console.log(`Instância ${name} criada com sucesso no Wuzapi. Aguardando QR Code...`);

      // Polling: o QR pode demorar alguns segundos para aparecer
      for (let attempt = 0; attempt < 6; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s
        const { qr, status, loggedIn } = await WhatsAppService.getQrCode(result.token);
        if (qr) return { success: true, qr };
        if (loggedIn) return { success: true, connected: true };
        console.warn(`QR ainda não disponível (tentativa ${attempt + 1}/6, status ${status}).`);
      }

      throw new Error(
        "A instância foi criada, mas o QR Code ainda não ficou disponível. Aguarde alguns segundos e clique em Sincronizar novamente.",
      );
    }

    throw new Error(result.error || "Falha ao criar instância.");
  } catch (error: any) {
    console.error("CRITICAL: Erro em connectWhatsAppInstance:", error);
    return { success: false, error: error.message || String(error) || "Erro interno no servidor" };
  }
}

export async function getWhatsAppConnectionStatus(agencyId: string) {
  try {
    const agency = await refreshAgencyUzapiTokenIfNeeded(agencyId);
    if (!agency) throw new Error("Agência não encontrada.");
    if (!agency.uzapiToken) return { success: true, connected: false, loggedIn: false };

    const status = await WhatsAppService.getStatus(agency.uzapiToken);
    return { success: true, connected: status.connected, loggedIn: status.loggedIn };
  } catch (error: any) {
    return { success: false, error: error.message, connected: false, loggedIn: false };
  }
}
