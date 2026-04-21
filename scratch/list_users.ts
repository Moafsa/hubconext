
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  console.log('Listando usuários do sistema...');
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      agencyId: true
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

listUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
