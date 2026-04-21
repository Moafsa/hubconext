const { WhatsAppService } = require("./src/services/whatsapp");

async function main() {
  const token = "tok_uerkyg";
  const status = await WhatsAppService.getStatus(token);
  console.log("Master WhatsApp Status:", JSON.stringify(status, null, 2));
}

main().catch(console.error);
