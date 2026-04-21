const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: 'master' }
    });
    console.log('Configuração Global:', config);
    
    if (!config) {
        console.log('ERRO: Configuração master não encontrada. Criando...');
        await prisma.systemConfig.create({
            data: { id: 'master', platformName: 'Conext Hub', primaryColor: '#3b82f6' }
        });
        console.log('Criado com sucesso.');
    }
  } catch (error) {
    console.error('Erro ao acessar SystemConfig:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
