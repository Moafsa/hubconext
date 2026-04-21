
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  console.log("--- INICIANDO DIAGNÓSTICO PROFUNDO PRISMA ---");
  try {
    const agency = await prisma.agency.findFirst();
    if (!agency) {
      console.log("ERRO: Nenhuma agência no banco.");
      return;
    }

    const client = await prisma.client.findFirst({ where: { agencyId: agency.id } });
    if (!client) {
      console.log("ERRO: Nenhum cliente para esta agência.");
      return;
    }

    console.log("Agency ID:", agency.id);
    console.log("Client ID:", client.id);

    // Mimetizando EXATAMENTE o payload do createProject
    const projectData = {
      title: "PROJETO DIAGNÓSTICO",
      description: "Descrição de teste para diagnóstico",
      type: "WEBSITE",
      status: "UNDER_REVIEW",
      proposedPrice: 1000,
      agencyId: agency.id,
      clientId: client.id,
      suggestedTech: "Tech Test",
      technicalScope: "Scope Test",
      contractText: "Contract Test",
      credentials: "Credentials Test",
      briefing: { test: true }
    };

    console.log("Tentando criar projeto via Prisma...");
    const project = await prisma.project.create({
      data: projectData
    });

    console.log("SUCESSO! Projeto criado:", project.id);
  } catch (error) {
    console.error("--- FALHA DETECTADA ---");
    console.error("Mensagem:", error.message);
    if (error.code) console.error("Código Prisma:", error.code);
    if (error.meta) console.error("Metadados:", JSON.stringify(error.meta, null, 2));
    console.error("Stack Trace Completo:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
