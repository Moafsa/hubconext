import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function requireSession(session: any) {
  if (!session?.user?.email) {
    return { ok: false as const, res: NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 }) };
  }
  return { ok: true as const };
}

function canManageTarget(sessionUser: any, target: any) {
  const isAdmin = sessionUser?.role === "CONEXT_ADMIN";
  if (isAdmin) return true;
  return Boolean(sessionUser?.agencyId && target?.agencyId && sessionUser.agencyId === target.agencyId);
}

/** Raw SQL update when Prisma Client is stale; isolates error handling (no nested try/catch in route). */
async function patchUserViaRawSql(
  id: string,
  fields: string[],
  values: any[],
  nextParamIndex: number,
  isAdmin: boolean,
): Promise<NextResponse> {
  const params = [...values, id];
  const idPlaceholder = nextParamIndex;
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET ${fields.join(", ")} WHERE "id" = $${idPlaceholder}`,
      ...params,
    );
    const refreshed = await prisma.user.findUnique({ where: { id } });
    return NextResponse.json({ success: true, user: refreshed });
  } catch (err: unknown) {
    const msg = String(err instanceof Error ? err.message : err);
    const isUnique = msg.includes("Unique constraint") || msg.includes("User_email_key") || msg.includes("unique");
    return NextResponse.json(
      { success: false, error: isUnique ? "EMAIL_ALREADY_EXISTS" : "FAILED_TO_UPDATE_USER", details: isAdmin ? msg : undefined },
      { status: 400 },
    );
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const guard = requireSession(session);
  if (!guard.ok) return guard.res;

  const { id } = await ctx.params;
  const me = session!.user as any;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  if (!canManageTarget(me, target)) return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const position = typeof body?.position === "string" ? body.position.trim() : undefined;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : undefined;
  const phone = typeof body?.phone === "string" ? body.phone.trim() : undefined;
  const isBlocked = typeof body?.isBlocked === "boolean" ? body.isBlocked : undefined;

  if (email !== undefined && (!email || !email.includes("@"))) {
    return NextResponse.json({ success: false, error: "INVALID_EMAIL" }, { status: 400 });
  }

  // Agência não pode bloquear admin master (e nem editar role)
  const isAdmin = me?.role === "CONEXT_ADMIN";
  if (!isAdmin && target.role === "CONEXT_ADMIN") {
    return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(position !== undefined ? { position } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(isBlocked !== undefined ? { isBlocked } : {}),
      } as any,
    });
    return NextResponse.json({ success: true, user: updated });
  } catch (e: any) {
    // Fallback raw update when Prisma Client outdated (OneDrive lock)
    const msg = String(e?.message || e);
    const looksLikeClientOutdated = msg.includes("Unknown argument") || msg.includes("PrismaClientValidationError");
    if (!looksLikeClientOutdated) {
      const isUnique = msg.includes("Unique constraint") || msg.includes("User_email_key") || msg.includes("unique");
      return NextResponse.json(
        {
          success: false,
          error: isUnique ? "EMAIL_ALREADY_EXISTS" : "FAILED_TO_UPDATE_USER",
          details: isAdmin ? msg : undefined,
        },
        { status: 400 },
      );
    }

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (name !== undefined) {
      fields.push(`"name" = $${i++}`);
      values.push(name);
    }
    if (position !== undefined) {
      fields.push(`"position" = $${i++}`);
      values.push(position);
    }
    if (email !== undefined) {
      fields.push(`"email" = $${i++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      fields.push(`"phone" = $${i++}`);
      values.push(phone);
    }
    if (isBlocked !== undefined) {
      fields.push(`"isBlocked" = $${i++}`);
      values.push(isBlocked);
    }
    if (fields.length === 0) return NextResponse.json({ success: true, user: target });

    return patchUserViaRawSql(id, fields, values, i, isAdmin);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const guard = requireSession(session);
  if (!guard.ok) return guard.res;

  const { id } = await ctx.params;
  const me = session!.user as any;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  if (!canManageTarget(me, target)) return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });

  // Não permitir se auto deletar
  if (String((me as any)?.id || "") === id) {
    return NextResponse.json({ success: false, error: "CANNOT_DELETE_SELF" }, { status: 400 });
  }

  // Agência não pode deletar admin master
  const isAdmin = me?.role === "CONEXT_ADMIN";
  if (!isAdmin && target.role === "CONEXT_ADMIN") {
    return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = String(e?.message || e);
    return NextResponse.json({ success: false, error: "FAILED_TO_DELETE_USER", details: isAdmin ? msg : undefined }, { status: 400 });
  }
}

