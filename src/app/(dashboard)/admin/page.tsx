import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getProjects } from "@/app/actions/db-actions";
import { KanbanBoard } from "@/components/Dashboard/Kanban/KanbanBoard";
import { redirect } from "next/navigation";
import { ShieldCheck, Filter, Download } from "lucide-react";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  
  // Proteção de Rota Master
  if (!session || (session.user as any).role !== "CONEXT_ADMIN") {
    redirect("/dashboard");
  }

  const projects = await getProjects(null); // Busca todos os projetos

  return (
    <div className="space-y-8">
      {/* Page Header Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <ShieldCheck className="w-4 h-4 text-blue-600" />
             <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Painel Administrativo Master</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Fluxo de Entrega</h1>
          <p className="text-slate-500 font-medium">Gerencie a esteira de produção e faturamento de todos os parceiros.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold transition-all hover:bg-slate-50">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold transition-all hover:bg-slate-50">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="bg-slate-50/50 -mx-8 px-8 py-2">
         <KanbanBoard initialProjects={projects} />
      </div>
    </div>
  );
}
