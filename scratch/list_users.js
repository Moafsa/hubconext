
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listUsers() {
  console.log('Listando usuários do sistema (JS)...');
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        agencyId: true
      }
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
