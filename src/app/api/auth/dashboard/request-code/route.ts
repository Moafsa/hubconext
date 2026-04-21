import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { MailService } from "@/services/mail";
import { WhatsAppService } from "@/services/whatsapp";

function hashCode(email: string, code: string) {
  const secret = process.env.DASHBOARD_OTP_SECRET || process.env.NEXTAUTH_SECRET || "fallback_dashboard_otp_secret";
  return crypto.createHash("sha256").update(`${secret}:${email}:${code}`).digest("hex");
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getMailConfigForUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const global = await prisma.systemConfig.findUnique({ where: { id: "master" } });

  // Admin: usa SMTP do SystemConfig (fallback para env se não configurado)
  if (user.role === "CONEXT_ADMIN") {
    if (global?.smtpHost && global.smtpUser && global.smtpPass) {
      return {
        config: {
          host: global.smtpHost,
          port: global.smtpPort || 587,
          user: global.smtpUser,
          pass: global.smtpPass,
          from: global.smtpFrom || global.smtpUser,
        },
        user,
      };
    }
    
    // Fallback para ENV (mecanismo legado/dev)
    const host = process.env.SMTP_HOST;
    const userEnv = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT || "587");
    const from = process.env.SMTP_FROM || userEnv;
    if (!host || !userEnv || !pass) return { config: null, user };
    return { config: { host, port, user: userEnv, pass, from }, user };
  }

  // Agência: usa SMTP configurado na agência (Settings)
  if (user.agencyId) {
    const agency = await prisma.agency.findUnique({ where: { id: user.agencyId } });
    
    // Se a agência tem SMTP, usa o dela
    if (agency?.smtpHost && agency.smtpUser && agency.smtpPass) {
      return {
        config: {
          host: agency.smtpHost,
          port: agency.smtpPort || 587,
          user: agency.smtpUser,
          pass: agency.smtpPass,
          from: agency.smtpFrom || agency.smtpUser,
        },
        user,
      };
    }

    // FALLBACK: Se a agência NÃO tem SMTP, usa o global do admin (SystemConfig)
    if (global?.smtpHost && global.smtpUser && global.smtpPass) {
      return {
        config: {
          host: global.smtpHost,
          port: global.smtpPort || 587,
          user: global.smtpUser,
          pass: global.smtpPass,
          from: global.smtpFrom || global.smtpUser,
        },
        user,
      };
    }
  }

  return { config: null, user };
}

async function getWhatsAppConfigForUser(user: any) {
  const global = await prisma.systemConfig.findUnique({ where: { id: "master" } });

  if (user.role === "CONEXT_ADMIN") {
    return global?.uzapiToken || null;
  }

  if (user.agencyId) {
    const agency = await prisma.agency.findUnique({ where: { id: user.agencyId } });
    // Se a agência tem zap, usa o dela. Senão, fallback pro master.
    return agency?.uzapiToken || global?.uzapiToken || null;
  }

  return global?.uzapiToken || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "INVALID_EMAIL" }, { status: 400 });
    }

    const found = await prisma.user.findUnique({ where: { email } });
    if (!found) return NextResponse.json({ success: false, error: "USER_NOT_FOUND" }, { status: 404 });
    if ((found as any).isBlocked) return NextResponse.json({ success: false, error: "USER_BLOCKED" }, { status: 403 });

    const code = generateCode();
    const codeHash = hashCode(email, code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Limpa códigos antigos (best effort)
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "DashboardLoginCode" WHERE "email"=$1 OR "expiresAt" < NOW()`, email);
    } catch {}

    // Insere via SQL (não depende do Prisma Client gerar model)
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DashboardLoginCode" ("id","email","codeHash","expiresAt","attempts","createdAt")
       VALUES (md5(random()::text || clock_timestamp()::text), $1, $2, $3, 0, NOW())`,
      email,
      codeHash,
      expiresAt,
    );

    const cfg = await getMailConfigForUser(email);
    const subject = "Seu código de acesso ao Conext Hub";
    const textMessage = `Seu código de verificação para acesso ao Conext Hub é: ${code}. Ele expira em 10 minutos.`;
    const html = `<p>Seu código de verificação é:</p><p style="font-size:28px; font-weight:800; letter-spacing:2px">${code}</p><p>Ele expira em 10 minutos.</p>`;

    const debugCode = process.env.NODE_ENV !== "production" ? code : undefined;

    let deliveredEmail = false;
    let deliveredWhatsapp = false;

    // 1. Tentar WhatsApp (se configurado e usuário tiver telefone)
    const zapToken = await getWhatsAppConfigForUser(found);
    if (zapToken && found.phone) {
      try {
        const zapRes = await WhatsAppService.sendText(zapToken, found.phone, textMessage);
        if (zapRes.success) deliveredWhatsapp = true;
      } catch (err) {
        console.error("Falha ao enviar OTP via WhatsApp:", err);
      }
    }

    // 2. Tentar E-mail
    if (cfg?.config) {
      const sent = await MailService.sendMail(cfg.config as any, email, subject, html);
      if ((sent as any).success) deliveredEmail = true;
    }

    if (!deliveredEmail && !deliveredWhatsapp) {
      // Se nada funcionou e estamos em dev, mostra o código no erro para não travar o dev
      return NextResponse.json({ 
        success: false, 
        error: "FAILED_TO_DELIVER_CODE", 
        debugCode,
        warning: "SMTP e WhatsApp não configurados ou falharam." 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      delivered: true, 
      via: { email: deliveredEmail, whatsapp: deliveredWhatsapp },
      debugCode 
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "INTERNAL_ERROR" }, { status: 500 });
  }
}

