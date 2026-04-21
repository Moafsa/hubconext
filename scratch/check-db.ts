
import { prisma } from "../src/lib/prisma";

async function check() {
  const configs = await prisma.systemConfig.findMany();
  console.log("Configs:", JSON.stringify(configs, null, 2));
  
  // Also check if there's any project with id the user mentioned
  const project = await prisma.project.findUnique({
    where: { id: "cmo8lsxcc000iyl60lpe3qsab" }
  });
  console.log("Project found:", !!project);
}

check();
