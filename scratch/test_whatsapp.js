
const { WhatsAppService } = require('./src/services/whatsapp');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWhatsApp() {
  const agencyId = 'clzk7e3m20000ux78e3m20000'; // ID da Agência Innova
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  
  console.log('Agência:', agency.name);
  console.log('Token atual:', agency.uzapiToken);
  
  if (agency.uzapiToken) {
    console.log('Verificando QR para token existente...');
    const result = await WhatsAppService.getQrCode(agency.uzapiToken);
    console.log('Resultado QR:', result);
  } else {
    console.log('Nenhum token encontrado. Criando nova instância...');
    const result = await WhatsAppService.createInstance(`agency_test_${Date.now()}`);
    console.log('Resultado Criação:', result);
  }
}

checkWhatsApp().catch(console.error).finally(() => prisma.$disconnect());
