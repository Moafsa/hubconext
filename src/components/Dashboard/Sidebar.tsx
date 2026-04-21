"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Settings, 
  LogOut,
  ChevronRight,
  Kanban,
  ShieldCheck,
  X
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const menuItems = [
    { name: "Resumo", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Projetos", icon: Briefcase, href: "/dashboard/projects" },
    { name: "Clientes", icon: Users, href: "/dashboard/clients" },
    { name: "Usuários", icon: Users, href: "/dashboard/users" },
    ...(role === "CONEXT_ADMIN" ? [
      { name: "Esteira Master", icon: Kanban, href: "/admin" },
      { name: "Agências", icon: Users, href: "/dashboard/agencies" },
      { name: "Configurações Hub", icon: ShieldCheck, href: "/admin/settings" },
    ] : [
      { name: "Configurações", icon: Settings, href: "/dashboard/settings" },
    ]),
  ];

  return (
    <div className="flex flex-col w-64 h-screen bg-slate-900 text-slate-300">
      <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800">
        <h1 className="text-xl font-black text-white tracking-widest uppercase">
          Conext<span style={{ color: "var(--color-primary)" }}>Hub</span>
        </h1>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? "text-white shadow-lg" 
                  : "hover:bg-slate-800 hover:text-white"
              }`}
              style={isActive ? { backgroundColor: "var(--color-primary)", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" } : {}}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400"}`} />
                <span className="font-medium">{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair do Sistema</span>
        </button>
      </div>
    </div>
  );
}
