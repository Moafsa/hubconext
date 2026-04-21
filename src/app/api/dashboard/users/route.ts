import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

function requireSession(session: any) {
  if (!session?.user?.email) {
    return { ok: false as const, res: NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 }) };
  }
  return { ok: true as const };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireSession(session);
  if (!guard.ok) return guard.res;

  const user = session!.user as any;
  const isAdmin = user.role === "CONEXT_ADMIN";

  // Não depender do Prisma Client estar regenerado (OneDrive lock)
  const users = isAdmin
    ? await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
           u."id", u."name", u."email", u."role"::text as "role", u."agencyId", u."position", u."phone", u."isBlocked",
           a."id" as "agency_id", a."name" as "agency_name"
         FROM "User" u
         LEFT JOIN "Agency" a ON a."id" = u."agencyId"
         ORDER BY u."name" ASC`,
      )
    : await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
           u."id", u."name", u."email", u."role"::text as "role", u."agencyId", u."position", u."phone", u."isBlocked"
         FROM "User" u
         WHERE u."agencyId" = $1
         ORDER BY u."name" ASC`,
        String(user.agencyId || "__none__"),
      );

  const normalized = (users || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    agencyId: u.agencyId ?? null,
    position: u.position ?? null,
    phone: u.phone ?? null,
    isBlocked: Boolean(u.isBlocked),
    ...(isAdmin
      ? { agency: u.agency_id ? { id: u.agency_id, name: u.agency_name } : null }
      : {}),
  }));

  return NextResponse.json({ success: true, users: normalized });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireSession(session);
  if (!guard.ok) return guard.res;

  const user = session!.user as any;
  const isAdmin = user.role === "CONEXT_ADMIN";

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  const name = String(body?.name || "").trim();
  const position = typeof body?.position === "string" ? body.position.trim() : null;
  const phone = typeof body?.phone === "string" ? body.phone.trim() : null;
  const requestedRole = String(body?.role || "").trim();
  const requestedAgencyId = body?.agencyId ? String(body.agencyId) : null;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ success: false, error: "INVALID_EMAIL" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ success: false, error: "MISSING_NAME" }, { status: 400 });
  }

  let role: Role = Role.AGENCY_USER;
  let agencyId: string | null = null;

  if (isAdmin) {
    if (requestedRole === "CONEXT_ADMIN" || requestedRole === "AGENCY_ADMIN" || requestedRole === "AGENCY_USER") {
      role = requestedRole as Role;
    } else {
      role = Role.CONEXT_ADMIN;
    }
    agencyId = (role !== "CONEXT_ADMIN" && requestedAgencyId) ? requestedAgencyId : null;
    if (role !== "CONEXT_ADMIN" && !agencyId) {
      return NextResponse.json({ success: false, error: "MISSING_AGENCY_CONTEXT" }, { status: 400 });
    }
  } else {
    if (requestedRole === "AGENCY_ADMIN" || requestedRole === "AGENCY_USER") {
      role = requestedRole as Role;
    } else {
      role = Role.AGENCY_USER;
    }
    agencyId = user.agencyId ? String(user.agencyId) : null;
    if (!agencyId) {
      return NextResponse.json({ success: false, error: "MISSING_AGENCY_CONTEXT" }, { status: 400 });
    }
  }

  try {
    let created: any = null;
    try {
      created = await prisma.user.create({
        data: {
          email,
          name,
          role,
          agencyId,
          position,
          phone,
        },
        include: isAdmin ? { agency: true } : undefined,
      });
    } catch (e: any) {
      // Workaround: quando Prisma Client não foi regenerado ainda (ex: OneDrive lock),
      // o create com campos novos pode falhar com validation error. Faz fallback via SQL.
      const msg = String(e?.message || e);
      const looksLikeClientOutdated =
        msg.includes("Unknown argument") ||
        msg.includes("Argument") && msg.includes("position") ||
        msg.includes("PrismaClientValidationError");

      if (!looksLikeClientOutdated) throw e;

      const idRow = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "User" ("id", "email", "name", "role", "agencyId", "position", "phone", "isBlocked")
         VALUES (md5(random()::text || clock_timestamp()::text), $1, $2, $3::"Role", $4, $5, $6, false)
         RETURNING "id"`,
        email,
        name,
        role,
        agencyId,
        position,
        phone,
      );
      const newId = Array.isArray(idRow) && idRow[0]?.id ? idRow[0].id : null;
      if (!newId) throw e;
      created = await prisma.user.findUnique({
        where: { id: newId },
        include: isAdmin ? { agency: true } : undefined,
      });
    }

    return NextResponse.json({ success: true, user: created }, { status: 201 });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const isUnique = msg.includes("Unique constraint") || msg.includes("User_email_key") || msg.includes("unique");
    return NextResponse.json(
      { success: false, error: isUnique ? "EMAIL_ALREADY_EXISTS" : "FAILED_TO_CREATE_USER", details: isAdmin ? msg : undefined },
      { status: 400 },
    );
  }
}

