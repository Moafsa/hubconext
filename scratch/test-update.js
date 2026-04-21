const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testUpdate() {
  try {
    const res = await prisma.systemConfig.update({
      where: { id: 'master' },
      data: { primaryColor: '#ff0000' }
    });
    console.log('Update Sucesso:', res);
  } catch (error) {
    console.error('Update FALHOU:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdate();
