const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.systemConfig.findUnique({ where: { id: "master" } });
  console.log("SystemConfig Master:", JSON.stringify(config, null, 2));

  const user = await prisma.user.findUnique({ where: { email: "maria@gmail.com" } });
  console.log("User Maria:", JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
