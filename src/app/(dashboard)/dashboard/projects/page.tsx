"use client";

import { useSession } from "next-auth/react";
import { getProjects } from "@/app/actions/db-actions";
import { 
  Plus, 
  Search, 
  Filter, 
  Sparkles
} from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { NewProjectWizard } from "@/components/Dashboard/Kanban/NewProjectWizard";
import { KanbanBoard } from "@/components/Dashboard/Kanban/KanbanBoard";
import { useSearchParams } from "next/navigation";

function ProjectsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const role = (session?.user as any)?.role;
  const agencyId = (session?.user as any)?.agencyId;

  const loadProjects = async () => {
    setIsLoading(true);
    const data = await getProjects(role === "CONEXT_ADMIN" ? null : agencyId);
    setProjects(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (session) {
      loadProjects();
    }
  }, [session, role, agencyId]);

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setIsWizardOpen(true);
      // Limpar o parâmetro da URL sem recarregar a página
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Esteira de Projetos</h1>
          <p className="text-slate-500 font-medium text-sm">Gerencie o fluxo completo, desde o briefing via IA até a entrega final.</p>
        </div>
        
        {role === "AGENCY_USER" && (
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-black transition-all shadow-xl shadow-slate-200"
          >
            <Sparkles className="w-5 h-5 text-blue-400" />
            Novo Pedido com IA
          </button>
        )}
      </div>

      {/* Grid / Kanban View */}
      <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 min-h-[600px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
             <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
             <span className="font-bold uppercase tracking-widest text-xs">Carregando Esteira...</span>
          </div>
        ) : (
          <KanbanBoard initialProjects={projects} />
        )}
      </div>

      {/* Mago de Projeto (Wizard) */}
      {isWizardOpen && (
        <NewProjectWizard 
          agencyId={agencyId} 
          onClose={() => {
            setIsWizardOpen(false);
            loadProjects();
          }} 
        />
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
