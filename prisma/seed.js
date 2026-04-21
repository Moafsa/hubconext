const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // 1. Inicializar Configuração Global (Conext Hub)
  await prisma.systemConfig.upsert({
    where: { id: 'master' },
    update: {},
    create: {
      platformName: 'Conext Hub',
      primaryColor: '#3b82f6', // Azul padrão Conext
    },
  })

  // 2. Criar Agência Innova (Exemplo)
  const agency = await prisma.agency.upsert({
    where: { cnpj: '12345678000199' },
    update: {},
    create: {
      name: 'Agência Innova',
      cnpj: '12345678000199',
      primaryColor: '#8b5cf6', // Roxo
    },
  })

  // 3. Criar Usuário Admin da Conext (Sem AgencyId por padrão)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@conext.click' },
    update: { agencyId: null }, // Garantir que está limpo
    create: {
      name: 'Moacir Admin',
      email: 'admin@conext.click',
      role: 'CONEXT_ADMIN',
    },
  })

  // 4. Criar Usuário da Agência
  const agencyUser = await prisma.user.upsert({
    where: { email: 'contato@agenciainnova.com.br' },
    update: {},
    create: {
      name: 'João Agency',
      email: 'contato@agenciainnova.com.br',
      role: 'AGENCY_USER',
      agencyId: agency.id,
    },
  })

  // 5. Criar Cliente final
  const client = await prisma.client.create({
    data: {
      name: 'Clínica Sorriso',
      email: 'financeiro@clinicasorriso.com.br',
      whatsapp: '5511999999999',
      agencyId: agency.id,
    },
  })

  // 6. Criar Projeto inicial
  await prisma.project.create({
    data: {
      title: 'Landing Page Odontológica',
      description: 'Criação de LP para captação de leads de implantes dentários.',
      status: 'WAITING_BRIEFING',
      agencyId: agency.id,
      clientId: client.id,
      proposedPrice: 1500,
      agreedPrice: 1500,
    },
  })

  console.log('Seed concluído com sucesso e Configuração Master criada!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
