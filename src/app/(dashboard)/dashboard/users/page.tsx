import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/Dashboard/Users/UsersManager";

export default async function DashboardUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const me = session.user as any;
  const isAdmin = me?.role === "CONEXT_ADMIN";

  const [users, agencies] = await Promise.all([
    isAdmin
      ? prisma.$queryRawUnsafe<any[]>(
          `SELECT 
             u."id", u."name", u."email", u."role"::text as "role", u."agencyId", u."position", u."phone", u."isBlocked",
             a."id" as "agency_id", a."name" as "agency_name"
           FROM "User" u
           LEFT JOIN "Agency" a ON a."id" = u."agencyId"
           ORDER BY u."name" ASC`,
        )
      : prisma.$queryRawUnsafe<any[]>(
          `SELECT 
             u."id", u."name", u."email", u."role"::text as "role", u."agencyId", u."position", u."phone", u."isBlocked"
           FROM "User" u
           WHERE u."agencyId" = $1
           ORDER BY u."name" ASC`,
          String(me?.agencyId || "__none__"),
        ),
    isAdmin
      ? prisma.agency.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const normalizedUsers = (users || []).map((u: any) => ({
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

  return <UsersManager initialUsers={normalizedUsers as any} agencies={agencies as any} />;
}

