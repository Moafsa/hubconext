
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log("Iniciando teste de criação...");
  try {
    const agency = await prisma.agency.findFirst();
    if (!agency) throw new Error("Nenhuma agência encontrada");

    console.log("Usando agência:", agency.id);

    let client = await prisma.client.findFirst({
      where: { email: 'test_internal@example.com' }
    });

    if (!client) {
        client = await prisma.client.create({
            data: {
                name: 'Cliente Teste Internal',
                email: 'test_internal@example.com',
                agencyId: agency.id
            }
        });
    }

    console.log("Cliente garantido:", client.id);

    const project = await prisma.project.create({
      data: {
        title: 'PROJETO TESTE INTERNO AG-KIT',
        description: 'Teste de persistência profunda',
        type: 'WEBSITE',
        status: 'UNDER_REVIEW',
        proposedPrice: 1234,
        agencyId: agency.id,
        clientId: client.id,
        suggestedTech: 'TEST TECH STACK',
        technicalScope: 'SCOPE TEST',
        contractText: 'CONTRACT TEST',
        briefing: { test: true, objective: 'Win' }
      }
    });

    console.log("SUCESSO! Projeto criado com ID:", project.id);
  } catch (err) {
    console.error("FALHA CRÍTICA NO PRISMA:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
