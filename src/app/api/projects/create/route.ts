import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WhatsAppService } from "@/services/whatsapp";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "AUTH_FAILED" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      title, description, type, clientName, clientEmail, clientWhatsapp,
      proposedPrice, agencyId, suggestedTech, technicalScope, 
      contractText, credentials, briefing 
    } = body;

    if (!agencyId || !clientEmail) {
      return NextResponse.json({ success: false, error: "MISSING_FIELDS", details: { agencyId, clientEmail } }, { status: 400 });
    }

    // 1. Client logic
    let client = await prisma.client.findFirst({
      where: { email: clientEmail, agencyId: agencyId }
    });

    const normalizedWhatsapp = clientWhatsapp ? WhatsAppService.normalizePhone(clientWhatsapp) : "";
    const whatsappToStore = normalizedWhatsapp ? normalizedWhatsapp : (clientWhatsapp || null);

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: clientName || "Cliente Final",
          email: clientEmail,
          whatsapp: whatsappToStore,
          agencyId: agencyId
        }
      });
    } else if (clientWhatsapp && !client.whatsapp) {
      await prisma.client.update({
        where: { id: client.id },
        data: { whatsapp: whatsappToStore }
      });
    }

    // 2. Project Logic
    const validTypes = ["WEBSITE", "LANDING_PAGE", "SYSTEM", "AUTOMATION", "LOGO", "OTHER"];
    const verifiedType = validTypes.includes(type) ? type : "WEBSITE";

    // 3. ATOMIC TRANSACTION (Better for consistency)
    const result = await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
            data: {
              title: title || "Novo Projeto",
              description: description || "",
              type: verifiedType as any,
              status: "UNDER_REVIEW",
              proposedPrice: proposedPrice ? Number(proposedPrice) : 0,
              agencyId,
              clientId: client.id,
              suggestedTech: suggestedTech || "",
              technicalScope: technicalScope || "",
              contractText: contractText || "",
              credentials: credentials || "",
              briefing: briefing || {}
            }
        });

        // Histórico
        await tx.projectHistory.create({
            data: {
                projectId: project.id,
                action: "Projeto Criado",
                details: "Criação consolidada via API Shield."
            }
        });

        // Arquivos
        const wizardFiles = briefing?.wizardFiles;
        if (Array.isArray(wizardFiles) && wizardFiles.length > 0) {
            for (const file of wizardFiles) {
                await tx.file.create({
                    data: {
                        filename: file.name,
                        minioKey: file.key,
                        fileType: file.type,
                        sizeBytes: Number(file.size),
                        projectId: project.id
                    }
                });
            }
        }

        return project;
    });

    return NextResponse.json({ success: true, id: result.id });

  } catch (error: any) {
    console.error("[API_ERROR]", error);
    // RETORNAR O ERRO REAL PARA O FRONTEND CONSEGUIR LER
    return NextResponse.json({ 
        success: false, 
        error: error.message,
        prismaCode: error.code,
        meta: error.meta
    }, { status: 500 });
  }
}
