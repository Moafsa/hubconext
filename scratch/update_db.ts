
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAgency() {
  console.log('Buscando agência...');
  const agency = await prisma.agency.findFirst();
  
  if (agency) {
    console.log(`Atualizando agência: ${agency.name} (ID: ${agency.id})`);
    await prisma.agency.update({
      where: { id: agency.id },
      data: {
        smtpHost: 'smtp.postmarkapp.com',
        smtpPort: 587,
        smtpUser: '08477a44-da72-4d7d-90e8-4b376a3dba22',
        smtpPass: '08477a44-da72-4d7d-90e8-4b376a3dba22',
        smtpFrom: 'noreply@conext.click'
      }
    });
    console.log('✅ Banco de dados atualizado com as credenciais do Postmark!');
  } else {
    console.error('❌ Nenhuma agência encontrada no banco de dados.');
  }
}

updateAgency()
  .catch(e => {
    console.error('❌ Erro ao atualizar o banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
