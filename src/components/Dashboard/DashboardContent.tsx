"use client";

import { useState } from "react";
import { 
  Plus, 
  MoreVertical,
  Calendar,
  DollarSign,
  Clock
} from "lucide-react";
import { NewProjectModal } from "./NewProjectModal";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  agreedPrice: number | null;
  proposedPrice: number | null;
  createdAt: Date | string;
  client: { name: string };
}

const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
  DRAFT: { label: "Rascunho", color: "text-slate-500", bg: "bg-slate-100" },
  NEGOTIATING: { label: "Negociando", color: "text-amber-500", bg: "bg-amber-50" },
  WAITING_INITIAL_PAY: { label: "Aguar. Entrada", color: "text-blue-500", bg: "bg-blue-50" },
  WAITING_BRIEFING: { label: "Aguardando Briefing", color: "text-indigo-500", bg: "bg-indigo-50" },
  IN_DEVELOPMENT: { label: "Em Produção", color: "text-purple-500", bg: "bg-purple-50" },
  TESTING: { label: "Homologação", color: "text-emerald-500", bg: "bg-emerald-50" },
  WAITING_FINAL_PAY: { label: "Aguar. Final", color: "text-cyan-500", bg: "bg-cyan-50" },
  DELIVERED: { label: "Entregue", color: "text-green-500", bg: "bg-green-50" },
  CANCELED: { label: "Cancelado", color: "text-red-500", bg: "bg-red-50" },
};

export function DashboardContent({ initialProjects }: { initialProjects: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState(initialProjects);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Projetos Ativos</h1>
          <p className="text-slate-500 font-medium">Gerencie suas demandas e acompanhe o status em tempo real.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Solicitar Novo Projeto
        </button>
      </div>

      {/* Projects List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {projects.map((project) => {
          const status = statusConfig[project.status] || statusConfig.DRAFT;
          const displayPrice = project.agreedPrice || project.proposedPrice;

          return (
            <div key={project.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 group">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black ${status.bg} ${status.color}`}>
                    {project.title.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-slate-400 text-sm font-medium">{project.client.name}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${status.bg} ${status.color}`}>
                  {status.label}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <DollarSign className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Valor</span>
                  </div>
                  <span className="text-sm font-black text-slate-700">
                    {displayPrice ? `R$ ${displayPrice.toLocaleString('pt-BR')}` : "A definir"}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Início</span>
                  </div>
                  <span className="text-sm font-black text-slate-700">
                    {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Última atualização agora mesmo</span>
                </div>
                
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Nenhum projeto encontrado</h3>
            <p className="text-slate-500 max-w-sm mt-2 font-medium">
              Inicie agora mesmo sua primeira demanda com a Conext para ver a mágica acontecer.
            </p>
          </div>
        )}
      </div>

      {isModalOpen && <NewProjectModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
