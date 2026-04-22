"use server";

/**
 * ORQUESTRADOR DE IA - CONEXT HUB
 * 
 * Este arquivo lida com a geração inteligente de escopos técnicos e contratos.
 * Para produção, integre com OpenAI (GPT-4o) ou similar.
 */

import { prisma } from "@/lib/prisma";

async function getLocalGlobalConfig() {
  try {
    return await prisma.systemConfig.findUnique({
      where: { id: "master" }
    });
  } catch (error) {
    console.error("Erro ao buscar global config (local):", error);
    return null;
  }
}

export async function generateDetailedBriefing(projectData: {
  type: string;
  title: string;
  description?: string;
  briefing: any;
  suggestedTech?: string;
  proposedPrice?: number;
}) {
  const config = await getLocalGlobalConfig();
  const apiKey = config?.openaiApiKey?.trim();

  const baseBriefing = projectData.briefing || {};
  const suggestedTech = projectData.suggestedTech || baseBriefing?.suggestedTech || "";

  if (apiKey && apiKey.startsWith("sk-")) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          response_format: { type: "json_object" },
          temperature: 0.35,
          messages: [
            {
              role: "system",
              content: `Você é um(a) Product Owner + Arquiteto(a) de Software sênior da Conext Hub.
Sua tarefa é GERAR um BRIEFING EXTREMAMENTE DETALHADO e acionável, em JSON, com todos os pormenores.

Regras:
- Responda APENAS com JSON válido (sem markdown).
- Não invente dados factuais (ex.: CNPJ, endereço, nomes). Quando faltar, use null ou "A DEFINIR".
- Seja completo em processos, governança, aceites, riscos, premissas, entregáveis, integrações e arquitetura.
- Use português brasileiro.

Estrutura obrigatória do JSON (chaves):
projectSummary { title, type, description, objective, successMetrics[] }
stakeholders { contractingSide, approvingSide, endUsers, contacts[] }
deliveryStrategy { needsMvp, mvpDefinition, v1Definition, releasePlan, prioritizationMethod }
scope { inScope[], outOfScope[], deliverables[], nonFunctional[] }
requirements { functional[], nonFunctional[], constraints[], assumptions[] }
ux { pagesOrScreens[], userJourneys[], accessibility, seo }
contentAndBrand { toneOfVoice, references[], colors, assetsNeeded[] }
integrations {
  systems[],
  keysAndAccess,
  authMethods[],
  dataEntities[],
  endpointsOrWebhooks[],
  dataFlow,
  syncFrequency,
  errorHandling,
  mappingNotes
}
architecture { overview, environments, deployment, observability, securityNotes }
process { phases[], milestones[], meetingsCadence, communicationChannels, changeRequestPolicy }
quality { definitionOfDone[], acceptanceCriteria[], qaPlan, securityChecklist[] }
operations { hosting, environments, monitoring, backups, handover, training }
commercial { budget, paymentSuggestion, timelineEstimate, requestedDeadline }
appendix { openQuestions[], risks[], dependencies[], notes }
generatedDocMarkdown (string): gere também uma versão em Markdown completa do briefing (com títulos e listas).`,
            },
            {
              role: "user",
              content: `Dados do projeto:
- Título: ${projectData.title}
- Tipo: ${projectData.type}
- Descrição: ${projectData.description || baseBriefing?.description || ""}
- Tecnologia sugerida: ${suggestedTech || "A DEFINIR"}
- Orçamento proposto: ${typeof projectData.proposedPrice === "number" ? projectData.proposedPrice : "A DEFINIR"}

Briefing parcial (JSON) já preenchido pelo wizard:
${JSON.stringify(baseBriefing)}`,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[BRIEFING] Erro da API OpenAI:", errorData);
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const json = await response.json();
      const contentString = json.choices?.[0]?.message?.content || "{}";
      const content = JSON.parse(contentString);

      if (content?.projectSummary && content?.scope && content?.requirements) {
        return content;
      }
    } catch (error) {
      console.error("[BRIEFING] Erro ao gerar briefing detalhado:", error);
    }
  }

  const objective =
    baseBriefing?.objective ||
    "Definir objetivos, requisitos, escopo, processos e critérios de aceite do projeto de forma clara e executável.";

  const references = Array.isArray(baseBriefing?.references) ? baseBriefing.references : [];
  const assetsNeeded = Array.isArray(baseBriefing?.assetChecklist) ? baseBriefing.assetChecklist : [];

  const generatedDocMarkdown = `
# Briefing Detalhado — ${projectData.title}

## 1) Visão geral
- **Tipo**: ${projectData.type}
- **Descrição**: ${projectData.description || baseBriefing?.description || "A DEFINIR"}
- **Objetivo**: ${objective}
- **Tecnologia sugerida**: ${suggestedTech || "A DEFINIR"}

## 2) Estratégia de entrega (MVP vs V1)
- **Precisa de MVP?**: A DEFINIR
- **Definição de MVP**: menor conjunto de funcionalidades para validar valor/uso e destravar feedback real
- **Definição de V1**: versão com fluxos completos, estabilidade, requisitos não-funcionais mínimos e handover
- **Critério de escolha**: prazo x orçamento x risco x urgência de go-live
- **Plano sugerido**: MVP → hardening (segurança/performance) → V1

## 2) Escopo (alto nível)
### Em escopo
- ${baseBriefing?.functionalities ? String(baseBriefing.functionalities) : "A DEFINIR"}

### Integrações
- ${baseBriefing?.integrations ? String(baseBriefing.integrations) : "A DEFINIR"}

### Fora de escopo (por padrão)
- Hospedagem e custos de terceiros (quando aplicável)
- Criação de conteúdo/extensa produção audiovisual (quando não contratado)
- Suporte contínuo pós-entrega (quando não contratado)

## 3) Processo e governança
- **Fases**: Descoberta → Arquitetura → Implementação → QA/Homologação → Go-live → Handover
- **Ritual**: alinhamento semanal, checkpoints por milestone, registro de decisões
- **Mudanças**: qualquer item novo vira solicitação de mudança (impacto em prazo/valor)

## 4) Integrações (detalhamento mínimo necessário)
- **Sistemas**: ${baseBriefing?.integrations ? String(baseBriefing.integrations) : "A DEFINIR"}
- **Autenticação**: OAuth2 / API Key / JWT / Webhook Secret (A DEFINIR)
- **Fluxo de dados**: quais entidades vão e voltam (ex.: Lead, Pedido, Usuário, Pagamento) (A DEFINIR)
- **Frequência**: realtime (webhook) / agendado / manual (A DEFINIR)
- **Tratamento de erros**: retries, dead-letter, logs, alerta (A DEFINIR)

## 4) Qualidade e aceite
- **Definition of Done (DoD)**:
  - requisitos atendidos
  - testes básicos executados
  - responsivo e performance aceitável
  - revisão de segurança aplicada
  - documentação mínima entregue
- **Critérios de aceite**: checklist por entregável + validação em ambiente de homologação

## 5) Materiais e acessos necessários
${assetsNeeded.length ? assetsNeeded.map((a: string) => `- ${a}`).join("\n") : "- A DEFINIR"}

## 6) Referências e branding
${references.length ? references.map((r: string) => `- ${r}`).join("\n") : "- A DEFINIR"}
- **Cores**: ${baseBriefing?.colors || "A DEFINIR"}

## 7) Perguntas em aberto
- Público-alvo, proposta de valor, diferenciais
- Regras de negócio e fluxos principais
- Prazos desejados e prioridade de entregas
`.trim();

  return {
    projectSummary: {
      title: projectData.title,
      type: projectData.type,
      description: projectData.description || baseBriefing?.description || null,
      objective,
      successMetrics: ["A DEFINIR"],
    },
    stakeholders: {
      contractingSide: "A DEFINIR",
      approvingSide: "A DEFINIR",
      endUsers: "A DEFINIR",
      contacts: [],
    },
    deliveryStrategy: {
      needsMvp: "A DEFINIR",
      mvpDefinition:
        "Menor conjunto de funcionalidades que valida o valor do produto e permite coletar feedback real com risco e custo reduzidos.",
      v1Definition:
        "Versão com fluxos completos e estabilizados, requisitos não-funcionais mínimos (segurança/performance) e preparação para operação/treinamento.",
      releasePlan: ["MVP", "Hardening (segurança/performance)", "V1", "Evoluções"],
      prioritizationMethod: "MoSCoW (Must/Should/Could/Won't) ou WSJF (A DEFINIR)",
    },
    scope: {
      inScope: [baseBriefing?.functionalities || "A DEFINIR"],
      outOfScope: [
        "Hospedagem e custos de terceiros (quando aplicável)",
        "Produção de conteúdo/filmagens extensas (quando não contratado)",
        "Suporte contínuo pós-entrega (quando não contratado)",
      ],
      deliverables: ["Escopo técnico", "Implementação", "Homologação", "Entrega e handover"],
      nonFunctional: ["Segurança básica", "Responsividade", "Performance", "Observabilidade mínima"],
    },
    requirements: {
      functional: [baseBriefing?.functionalities || "A DEFINIR"],
      nonFunctional: ["A DEFINIR"],
      constraints: [],
      assumptions: [],
    },
    ux: {
      pagesOrScreens: ["A DEFINIR"],
      userJourneys: ["A DEFINIR"],
      accessibility: "A DEFINIR",
      seo: projectData.type === "WEBSITE" || projectData.type === "LANDING_PAGE" ? "A DEFINIR" : "N/A",
    },
    contentAndBrand: {
      toneOfVoice: "A DEFINIR",
      references,
      colors: baseBriefing?.colors || "A DEFINIR",
      assetsNeeded,
    },
    integrations: {
      keysAndAccess: baseBriefing?.hasKeys || "pending",
      systems: [baseBriefing?.integrations || "A DEFINIR"],
      authMethods: ["A DEFINIR"],
      dataEntities: ["A DEFINIR"],
      endpointsOrWebhooks: ["A DEFINIR"],
      dataFlow: "A DEFINIR",
      syncFrequency: "A DEFINIR",
      errorHandling: "A DEFINIR",
      mappingNotes: "A DEFINIR",
    },
    architecture: {
      overview: "A DEFINIR",
      environments: ["dev", "staging", "prod"],
      deployment: "A DEFINIR",
      observability: "Logs + métricas básicas (A DEFINIR)",
      securityNotes: "Auth, validação, RBAC quando aplicável (A DEFINIR)",
    },
    process: {
      phases: ["Descoberta", "Arquitetura", "Implementação", "QA/Homologação", "Go-live", "Handover"],
      milestones: ["Kickoff", "Primeiro incremento", "Homologação", "Go-live"],
      meetingsCadence: "Semanal (ou a definir)",
      communicationChannels: ["Conext Hub (timeline/chat)"],
      changeRequestPolicy: "Mudanças após aprovação do escopo exigem reestimativa e aceite.",
    },
    quality: {
      definitionOfDone: [
        "Requisitos atendidos",
        "Testes básicos executados",
        "Responsivo",
        "Checklist de segurança aplicado",
        "Documentação mínima entregue",
      ],
      acceptanceCriteria: ["Checklist por entregável em homologação"],
      qaPlan: "Testes funcionais + regressão leve + validação cross-browser (quando aplicável).",
      securityChecklist: ["Headers básicos", "Validação/escape", "Controle de acesso", "Logs mínimos"],
    },
    operations: {
      hosting: "A DEFINIR",
      environments: ["dev", "staging", "prod"],
      monitoring: "A DEFINIR",
      backups: "A DEFINIR",
      handover: "Entrega de acessos, documentação e orientações.",
      training: "A DEFINIR",
    },
    commercial: {
      budget: typeof projectData.proposedPrice === "number" ? projectData.proposedPrice : null,
      paymentSuggestion: "50% início + 50% entrega (padrão)",
      timelineEstimate: "15–30 dias úteis (baseline; varia por escopo)",
      requestedDeadline: baseBriefing?.requestedDeadline || null,
    },
    appendix: {
      openQuestions: ["A DEFINIR"],
      risks: ["A DEFINIR"],
      dependencies: ["A DEFINIR"],
      notes: "",
    },
    generatedDocMarkdown,
  };
}

export async function generateProjectScope(projectData: { type: string, title: string, briefing: any }) {
  const config = await getLocalGlobalConfig();
  const apiKey = config?.openaiApiKey;

  if (apiKey && apiKey.startsWith("sk-")) {
    try {
      // Implementação REAL com OpenAI se a chave estiver configurada
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Você é um Engenheiro de Software Sênior e Estrategista Digital do Conext Hub. Seu objetivo é gerar um Escopo Técnico extremamente detalhado, profissional e persuasivo em Markdown para um novo projeto."
            },
            {
              role: "user",
              content: `Gere um escopo técnico para o projeto: ${projectData.title}. 
              Tipo: ${projectData.type}. 
              Objetivo: ${projectData.briefing.objective}. 
              Funcionalidades: ${projectData.briefing.functionalities}. 
              Integrações: ${projectData.briefing.integrations}.
              Descrição: ${projectData.briefing.description}.
              
              O documento deve conter: Objetivo, Funcionalidades Detalhadas, Stack Tecnológica Recomendada (pense em performance e escalabilidade), Plano de Segurança, Cronograma de Milestones e Critérios de Aceite.`
            }
          ],
          temperature: 0.7
        })
      });

      const json = await response.json();
      if (json.choices?.[0]?.message?.content) {
        return json.choices[0].message.content;
      }
    } catch (error) {
      console.error("Erro OpenAI:", error);
      // Fallback para o template rico se a IA falhar
    }
  }

  // TEMPLATES RICOS (Fallback ou Default sem API Key)
  const templates: any = {
    WEBSITE: `
# Proposta Técnica: ${projectData.title}

## 🎯 Objetivo Estratégico
${projectData.briefing.objective || "Desenvolver uma presença digital profissional e de alta performance."}

## 🚀 Escopo de Funcionalidades
- **Arquitetura SEO-Friendly:** Estrutura otimizada para buscadores (Google).
- **Painel Administrativo:** Gestão autônoma de conteúdos e banners.
- **Performance Core Web Vitals:** Carregamento ultra-rápido (< 2s).
- **Blog/Notícias:** Sistema de publicação com categorias e tags.
- **Integração Social:** Links dinâmicos e feed de redes sociais.
${projectData.briefing.functionalities ? `\n### Requisitos Específicos:\n${projectData.briefing.functionalities}` : ""}

## 🛠️ Stack Tecnológica (Premium)
- **Frontend:** Next.js 15 + React 19 (Server Components).
- **Estilização:** Tailwind CSS + Framer Motion para animações fluidas.
- **Infraestrutura:** Edge Computing (Vercel/Cloudflare) para baixa latência.
- **CMS:** Headless CMS ou Admin Customizado conforme necessidade.

## 📅 Milestones de Entrega
1. **Estrutura & Mockups:** Definição da arquitetura e wireframes.
2. **Desenvolvimento Core:** Finalização das páginas e funções principais.
3. **QA & Go-Live:** Testes de responsividade, SEO e deploy final.
    `,
    LANDING_PAGE: `
# Proposta: Landing Page de Alta Conversão - ${projectData.title}

## 🎯 Objetivo de Conversão
${projectData.briefing.objective || "Maximizar a captura de leads e taxa de vendas."}

## 🛠️ Arquitetura de Conversão
- **Design de Seções:** Hero, Dor/Solução, Prova Social, Oferta, FAQ.
- **Copywriting Integrado:** Estrutura focada em gerar ação imediata.
- **Otimização de Mobile:** Experiência 'mobile-first' impecável.
- **Trackeamento:** Configuração de Pixels (Meta/Google) e Tag Manager.
- **VSL Integration:** Suporte a players de vídeo de alta retenção.

## ⚙️ Diferenciais Técnicos
- **LCP Otimizado:** Máxima nota no Google PageSpeed.
- **Segurança SSL:** Certificado de segurança garantido.
- **Formulários Inteligentes:** Captura de dados com integração direta ao CRM.
    `,
    SYSTEM: `
# Especificação Técnica: Sistema de Negócios - ${projectData.title}

## 🏗️ Visão Geral do Sistema
${projectData.briefing.objective || "Construção de plataforma SaaS ou sistema interno customizado."}

## ⚙️ Arquitetura e Engenharia
- **Database Architecture:** Modelagem relacional para alta integridade de dados.
- **Role-Based Access Control (RBAC):** Gestão fina de permissões por usuário.
- **Dashboard Analítico:** Visualização de dados e KPI's em tempo real.
- **API First:** Estrutura preparada para futuras integrações mobile.

## 🛡️ Segurança & Escalabilidade
- **Auth Proxy:** Proteção contra ataques de força bruta.
- **Data Encryption:** Dados sensíveis criptografados em repouso.
- **Serverless Compute:** Escalabilidade automática sob demanda.
    `,
    AUTOMATION: `
# Plano de Automação Inteligente: ${projectData.title}

## 🤖 Fluxo de Automação
${projectData.briefing.objective || "Redução de processos manuais e integração de ecossistemas."}

## 🔗 Conectividade & Webhooks
- **Sincronização Bidirecional:** Dados fluindo entre múltiplos softwares.
- **Tratamento de Erros:** Queue system para garantir re-tentativas em falhas.
- **Relatórios de Log:** Monitoramento total de execuções e sucessos.
    `,
    LOGO: `
# Identidade Visual & Branding: ${projectData.title}

## 🎨 Conceito Criativo
${projectData.briefing.objective || "Criação de marca memorável e posicionamento de mercado."}

## 📦 Entregas e Ativos
- **Logotipo Principal:** Versão horizontal e vertical.
- **Manual da Marca:** Tipografia, paleta de cores (HEX/RGB) e regras de uso.
- **Variantes de Fundo:** Versões para fundos claros, escuros e coloridos.
- **Formatos Profissionais:** Vetores (AI/EPS), PDF para impressão e PNG transparente.
- **Pattern & Ícones:** Elementos de apoio para comunicação visual.

## 📅 Etapas do Design
1. **Briefing & Referências:** Alinhamento de gosto e expectativas.
2. **Brainstorming & Rascunhos:** Desenvolvimento das primeiras rotas criativas.
3. **Refinamento & Versão Final:** Ajustes finos e exportação dos pacotes de arquivos.
    `
  };

  const defaultTemplate = `
# Escopo do Projeto: ${projectData.title}
## Objetivo: ${projectData.briefing.objective || "Não informado"}
## Detalhes: ${projectData.briefing.description || "Não informado"}

Este é um escopo gerado para o projeto ${projectData.title}. 
Entre em contato com o Admin para detalhamentos específicos.
  `;

  return templates[projectData.type] || defaultTemplate;
}

export async function generateAssetChecklist(projectData: { type: string }) {
  const common = ["Logo em alta resolução (Vetor/PNG)", "Identidade Visual (Manual da Marca)", "Textos e Copys das seções"];
  
  const typeSpecific: any = {
    WEBSITE: ["Fotos institucionais", "Vídeo de apresentação", "Acessos do domínio/DNS"],
    LANDING_PAGE: ["Provas Sociais (Depoimentos)", "Vídeo de Vendas (VSL)", "Pixel do Facebook/Google"],
    SYSTEM: ["Documentação de processos", "Planilhas de dados para importação", "Acessos ao servidor atual"],
    AUTOMATION: ["Keys de API (RD Station, CRM, etc)", "Fluxograma de processos", "Webhook de terceiros"],
    LOGO: ["Briefing de cores preferidas", "Exemplos de logos que gosta", "Missão/Visão da empresa"]
  };

  return [...common, ...(typeSpecific[projectData.type] || [])];
}

export async function generateContract(projectData: {
  title: string;
  clientName: string;
  proposedPrice: number;
  agreedPrice?: number;
  installments?: Array<{ amount: number; dueDate: Date | string; status: string }>;
  agencyName?: string;
  agencyCnpj?: string;
  agencyLegalName?: string;
  agencyPhone?: string;
  responsiblePhone?: string;
  agencyAddress?: string;
  agencyResponsibleName?: string;
  suggestedTech?: string;
  technicalScope?: string;
  briefing?: any;
}) {
  const now = new Date();
  const dateExt = now.toLocaleDateString("pt-BR");
  const day = String(now.getDate()).padStart(2, "0");
  const month = now.toLocaleString("pt-BR", { month: "long" });
  const year = String(now.getFullYear());

  const agencyDisplayName = projectData.agencyName || projectData.clientName || "A DEFINIR";
  const agencyLegalName = projectData.agencyLegalName || agencyDisplayName;
  const cnpj = projectData.agencyCnpj || "00.000.000/0000-00";
  const agencyAddress = projectData.agencyAddress || "Endereço Completo";
  const agencyPhone = projectData.agencyPhone || projectData.responsiblePhone || "(00) 00000-0000";
  const responsible = projectData.agencyResponsibleName || "A DEFINIR";

  const totalValue = projectData.agreedPrice ?? projectData.proposedPrice;
  const total = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue);
  const entry = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue * 0.5);
  const final = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue * 0.5);

  const CONEXT_LEGAL_NAME = "Conexão Enterprise Eventos LTDA.";
  const CONEXT_CNPJ = "10.654.725/0001-57";
  const CONEXT_REPRESENTATIVE = "Moacir Ferreira dos Santos";
  const CONEXT_CITY = "Flores da Cunha – RS";

  const installments = Array.isArray(projectData.installments) ? projectData.installments : [];
  const installmentsBlock =
    installments.length > 0
      ? `
**Parcelamento (referência):**
${installments
  .map((p, idx) => {
    const due = p.dueDate instanceof Date ? p.dueDate : new Date(p.dueDate);
    const dueStr = isNaN(due.getTime()) ? String(p.dueDate) : due.toLocaleDateString("pt-BR");
    const amt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(p.amount) || 0);
    return `- Parcela ${idx + 1}: ${amt} — venc. ${dueStr} — ${p.status}`;
  })
  .join("\n")}
`
      : "";

  const contract = `
# CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA E DESENVOLVIMENTO SOFTWARE

**CONTRATANTE:** ${agencyDisplayName}, pessoa jurídica de direito privado, inscrita no CNPJ sob nº ${cnpj}, com sede em ${agencyAddress}, telefone ${agencyPhone}, neste ato representada por ${responsible}, doravante denominada simplesmente **AGÊNCIA**.

**CONTRATADA:** **CONEXT HUB** (${CONEXT_LEGAL_NAME}), pessoa jurídica de direito privado, inscrita no CNPJ sob nº **${CONEXT_CNPJ}**, representada por **${CONEXT_REPRESENTATIVE}**, operando através do domínio **conext.click**, com sede em **${CONEXT_CITY}**, doravante denominada simplesmente **DESENVOLVEDORA**.

As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas seguintes:

---

## CLÁUSULA 1ª – DO OBJETO
**1.1.** O objeto deste contrato é a prestação de serviços de desenvolvimento de sites, Landing Pages (LPs), sistemas, automações e softwares pela DESENVOLVEDORA para atender às demandas da AGÊNCIA e de seus respectivos clientes.

## CLÁUSULA 2ª – DO FLUXO DE TRABALHO POR DEMANDA
**2.1.** A contratação dos serviços ocorrerá de forma pontual conforme a necessidade da AGÊNCIA.  
**2.2.** Para cada projeto, a DESENVOLVEDORA apresentará um orçamento específico contendo:
- Descrição do Escopo Técnico;
- Linguagem ou Plataforma acordada;
- Valor total do projeto;
- Cronograma de entrega (incluindo marcos de MVP, se houver).

**2.3.** A aprovação do orçamento por meio escrito (e-mail ou mensagem eletrônica) pela AGÊNCIA autoriza o início imediato dos trabalhos e vincula as partes aos termos ali descritos.

> **Projeto atual (Ordem de Serviço):** ${projectData.title}  
> **Tecnologia sugerida:** ${projectData.suggestedTech || "A DEFINIR"}  
> **Valor total acordado (referência):** ${total}  
> **Escopo técnico (anexo no projeto):** conforme documento anexado no Conext Hub.
${installmentsBlock ? `\n> ${installmentsBlock.trim().replace(/\n/g, "\n> ")}\n` : ""}

## CLÁUSULA 3ª – DOS VALORES E FORMA DE PAGAMENTO
**3.1.** Pelos serviços prestados, a AGÊNCIA pagará à DESENVOLVEDORA o valor acordado em cada orçamento individual, seguindo a seguinte regra:
- 50% (cinquenta por cento) a título de entrada, para início do projeto (**${entry}**).
- 50% (cinquenta por cento) no ato da entrega final (publicação em ambiente de produção) (**${final}**).

**3.2.** A entrega considera-se realizada quando o sistema/site estiver funcional no domínio do cliente ou código-fonte entregue.  
**3.3.** Serviços de manutenção, suporte pós-garantia ou novas funcionalidades solicitadas após a entrega serão objeto de novo orçamento.

${installments.length > 0 ? `\n**3.4.** Quando houver parcelamento acordado, ele seguirá o cronograma registrado no Conext Hub, conforme lista de parcelas acima.\n` : ""}

## CLÁUSULA 4ª – DA INFRAESTRUTURA E HOSPEDAGEM
**4.1.** Salvo disposição em contrário no orçamento, a contratação de servidores, domínios e certificados SSL é de inteira responsabilidade e custo do cliente final ou da AGÊNCIA.  
**4.2.** A DESENVOLVEDORA desenvolverá o projeto em ambiente local ou de homologação e, após a quitação total, realizará o "deploy" (subida) para o servidor do cliente.

## CLÁUSULA 5ª – PRAZOS, TESTES E MVP
**5.1.** Os prazos de entrega serão estipulados em cada projeto e iniciam-se apenas após o pagamento da entrada e entrega de todos os materiais (textos, imagens, acessos) pela AGÊNCIA.  
**5.2.** Fase de Testes: Após a entrega da versão preliminar, a AGÊNCIA terá **05 (cinco)** dias úteis para realizar testes e solicitar ajustes de bugs. Alterações de design ou funcionalidades não previstas no escopo inicial não são consideradas ajustes e serão cobradas à parte.  
**5.3.** MVP (Produto Mínimo Viável): Em projetos de software complexos, as partes podem acordar uma entrega funcional simplificada para agilizar a entrada no mercado, com evoluções programadas subsequentes.

## CLÁUSULA 6ª – VIGÊNCIA E RENOVAÇÃO
**6.1.** Este contrato terá vigência de **12 (doze)** meses a partir da data de assinatura.  
**6.2.** Renovação: O contrato será renovado automaticamente por iguais períodos, caso nenhuma das partes se manifeste contrária com 30 (trinta) dias de antecedência.  
**6.3.** A rescisão deste contrato não desobriga as partes do cumprimento das Ordens de Serviço que já estiverem em andamento até sua conclusão e quitação.

## CLÁUSULA 7ª – CONFIDENCIALIDADE E PROPRIEDADE INTELECTUAL
**7.1.** A DESENVOLVEDORA atuará em regime de "White Label", mantendo sigilo sobre a parceria perante o cliente final, salvo se autorizado pela AGÊNCIA.  
**7.2.** A propriedade intelectual do código customizado será transferida ao cliente final/agência somente após a quitação integral dos valores acordados.

## CLÁUSULA 8ª – DO FORO
**8.1.** Para dirimir quaisquer controvérsias oriundas deste Contrato, as partes elegem o Foro da Comarca de **Flores da Cunha – RS**, com renúncia expressa a qualquer outro por mais privilegiado que seja.

E, por estarem assim justas e contratadas, as partes assinam o presente instrumento.

**Flores da Cunha – RS, ${day} de ${month} de ${year}.**

**${agencyLegalName}**  
CONTRATANTE (AGÊNCIA)

**CONEXT HUB — ${CONEXT_LEGAL_NAME} (conext.click)**  
CONTRATADA (DESENVOLVEDORA)

---

## ANEXO — ESCOPO TÉCNICO (do projeto)
${projectData.technicalScope?.trim() ? projectData.technicalScope.trim() : "_Escopo técnico a ser anexado no projeto._"}
`.trim();

  return contract;
}
/**
 * Analisa o histórico de chat e atualiza o Escopo e Contrato
 */
export async function analyzeChatAndUpdateContent(data: {
  title: string;
  currentBriefing: any;
  currentScope: string;
  currentContract: string;
  chatHistory: string;
  suggestedTech?: string;
  proposedPrice?: number;
  agreedPrice?: number;
  installments?: Array<{ amount: number; dueDate: string; status: string }>;
}) {
  console.log("[AI-SYNC] Iniciando análise de chat para o projeto:", data.title);
  
  const config = await getLocalGlobalConfig();
  const apiKey = config?.openaiApiKey?.trim();

  if (!apiKey) {
    console.warn("[AI-SYNC] Alerta: Chave OpenAI não encontrada no banco. Usando simulador.");
  } else if (!apiKey.startsWith("sk-")) {
    console.warn("[AI-SYNC] Alerta: Chave OpenAI parece inválida (não começa com 'sk-').");
  }

  if (apiKey && apiKey.startsWith("sk-")) {
    console.log("[AI-SYNC] Chave detectada. Chamando OpenAI (gpt-4o)...");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Você é um arquiteto de sistemas sênior da Conext Hub. 
              Sua tarefa é analisar o histórico do chat entre Agência e Cliente e atualizar os 3 principais documentos do projeto de forma COERENTE.
              
              DADOS FINANCEIROS (DEVEM SER REFLETIDOS NO CONTRATO E NO BRIEFING):
              - Preço proposto: ${data.proposedPrice ?? "A DEFINIR"}
              - Preço acordado: ${data.agreedPrice ?? "A DEFINIR"}
              - Parcelas (se houver): ${JSON.stringify(data.installments || [])}

              DOCUMENTOS ATUAIS:
              1. Briefing (JSON): ${JSON.stringify(data.currentBriefing)}
              2. Escopo Técnico (Texto): ${data.currentScope}
              3. Contrato (Texto): ${data.currentContract}
              
              INSTRUÇÕES:
              - Se o cliente pediu algo novo no chat, adicione ao Escopo Técnico.
              - Mantenha o que já foi acordado, apenas adicione ou refine.
              - Atualize o Briefing se houver novas informações sobre objetivos, funcionalidades, integrações, prazos, stakeholders e também FINANCEIRO (valores/parcelas).
              - O contrato deve refletir as mudanças do escopo e também os valores atuais (preço acordado/proposto e forma de pagamento/parcelamento).
              
              Retorne APENAS um objeto JSON válido com as chaves:
              "updatedBriefing": (objeto JSON completo e atualizado)
              "updatedScope": (texto formatado em Markdown do escopo atualizado)
              "updatedContract": (texto formatado do contrato atualizado)
              
              Responda em PORTUGUÊS. Se não houver nada relevante no chat, repita o conteúdo original.
              Importante: Como você está usando o modo 'json_object', garanta que seu output seja EXATAMENTE o JSON solicitado.`
            },
            {
              role: "user",
              content: `Histórico do Chat:\n${data.chatHistory}\n\nTecnologia Sugerida: ${data.suggestedTech || 'Não definida'}`
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[AI-SYNC] Erro da API OpenAI:", errorData);
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const json = await response.json();
      console.log("[AI-SYNC] Resposta recebida da OpenAI com sucesso.");
      
      const contentString = json.choices?.[0]?.message?.content || "{}";
      const content = JSON.parse(contentString);

      if (content.updatedBriefing || content.updatedScope || content.updatedContract) {
        console.log("[AI-SYNC] Dados extraídos com sucesso do JSON.");
        return {
          updatedBriefing: content.updatedBriefing || data.currentBriefing,
          updatedScope: content.updatedScope || data.currentScope,
          updatedContract: content.updatedContract || data.currentContract
        };
      }
    } catch (error) {
      console.error("[AI-SYNC] Erro ao chamar OpenAI:", error);
    }
  }

  // Fallback / Modo Simulado (Preservando a lógica de append se não houver chave)
  const updatedScope = `
${data.currentScope}

## [ATUALIZAÇÃO VIA IA - BASEADA NO CHAT]
- **Tecnologia Definida:** ${data.suggestedTech}
- **Observação:** Ative sua OpenAI API Key para uma sincronização inteligente completa.
- [IA]: Sincronização básica concluída.

---
*Sincronizado em: ${new Date().toLocaleString('pt-BR')}*
  `;

  return {
    updatedBriefing: data.currentBriefing, // Simulado não mexe no briefing pra evitar corrupção
    updatedScope: updatedScope.trim(),
    updatedContract: data.currentContract,
  };
}
