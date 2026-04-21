import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAgencySettings, getGlobalConfig } from "@/app/actions/db-actions";
import { DashboardShell } from "@/components/Dashboard/DashboardShell";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;
  let primaryColor = "#3b82f6"; // Default Hub Blue

  if (user.role === "CONEXT_ADMIN") {
     // Super Admin busca cor do Sistema Global
     const config = await getGlobalConfig();
     if (config?.primaryColor) primaryColor = config.primaryColor;
  } else if (user.agencyId) {
     // Agência busca sua própria cor
     const agency = await getAgencySettings(user.agencyId);
     if (agency?.primaryColor) primaryColor = agency.primaryColor;
  }

  return (
    <div 
      className="min-h-screen transition-colors duration-500"
      style={{ "--color-primary": primaryColor } as any}
    >
      <DashboardShell>
        {children}
      </DashboardShell>
    </div>
  );
}
