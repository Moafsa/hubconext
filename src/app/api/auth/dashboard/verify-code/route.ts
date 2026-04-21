import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function hashCode(email: string, code: string) {
  const secret = process.env.DASHBOARD_OTP_SECRET || process.env.NEXTAUTH_SECRET || "fallback_dashboard_otp_secret";
  return crypto.createHash("sha256").update(`${secret}:${email}:${code}`).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").trim();
    if (!email || !email.includes("@") || code.length < 4) {
      return NextResponse.json({ success: false, error: "INVALID_INPUT" }, { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "DashboardLoginCode"
       WHERE "email"=$1 AND "consumedAt" IS NULL AND "expiresAt" > NOW()
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      email,
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return NextResponse.json({ success: false, error: "CODE_NOT_FOUND" }, { status: 400 });

    if (Number(row.attempts || 0) >= 5) {
      return NextResponse.json({ success: false, error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
    }

    const expected = String(row.codeHash || "");
    const got = hashCode(email, code);
    const ok = expected && got && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got));

    if (!ok) {
      await prisma.$executeRawUnsafe(`UPDATE "DashboardLoginCode" SET "attempts"="attempts"+1 WHERE "id"=$1`, row.id);
      return NextResponse.json({ success: false, error: "INVALID_CODE" }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(`UPDATE "DashboardLoginCode" SET "consumedAt"=NOW() WHERE "id"=$1`, row.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "INTERNAL_ERROR" }, { status: 500 });
  }
}

