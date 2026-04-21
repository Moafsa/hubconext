"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  MoreVertical, 
  DollarSign, 
  User as UserIcon,
  ExternalLink,
  ChevronRight,
  Trash2,
  Maximize2
} from "lucide-react";
import { updateProjectStatus, deleteProject } from "@/app/actions/db-actions";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  agreedPrice: number | null;
  proposedPrice: number | null;
  createdAt: Date | string;
  agency: { name: string, primaryColor: string | null };
  client: { name: string };
}

const COLUMNS = [
  { id: "NEGOTIATING", title: "Negociação" },
  { id: "WAITING_INITIAL_PAY", title: "Pagamento 50%" },
  { id: "WAITING_BRIEFING", title: "Briefing" },
  { id: "IN_DEVELOPMENT", title: "Produção" },
  { id: "TESTING", title: "Homologação" },
  { id: "DELIVERED", title: "Concluído" },
];

export function KanbanCard({ project, onClick, onUpdate }: { project: Project, onClick: () => void, onUpdate: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const agencyColor = project.agency.primaryColor || "#3b82f6";
  const displayPrice = project.agreedPrice || project.proposedPrice;

  const handleMove = async (newStatus: string) => {
    const res = await updateProjectStatus(project.id, newStatus);
    if (res.success) onUpdate();
    setIsMenuOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Excluir este projeto?")) {
      const res = await deleteProject(project.id);
      if (res.success) onUpdate();
    }
    setIsMenuOpen(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative mb-3
        ${isDragging ? "z-50 ring-2 ring-blue-500" : ""}
      `}
      onClick={onClick}
    >
      {/* Quick Menu Toggle */}
      <div 
        className="absolute top-3 right-3 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
             <div className="px-3 py-1 mb-1 border-b border-slate-100 italic text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mover para...</div>
             {COLUMNS.filter(c => c.id !== project.status).map(col => (
               <button 
                key={col.id} 
                onClick={() => handleMove(col.id)}
                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-between group/item"
               >
                 {col.title}
                 <ChevronRight className="w-3 h-3 text-slate-300 group-hover/item:text-blue-500 transition-all" />
               </button>
             ))}
             <div className="my-1 border-t border-slate-100" />
             <button 
               onClick={handleDelete}
               className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
             >
               <Trash2 className="w-3 h-3" /> Excluir Projeto
             </button>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between mb-3 border-b border-blue-50 pb-3">
        <div className="flex flex-col">
          {/* Drag Handle Area - Drag allowed only via the Agency Label area for better control */}
          <div {...attributes} {...listeners} className="flex flex-col cursor-grab active:cursor-grabbing">
            <span 
              className="text-[9px] font-black uppercase tracking-widest mb-1 px-2 py-0.5 rounded-full inline-block w-fit"
              style={{ backgroundColor: `${agencyColor}15`, color: agencyColor }}
            >
              {project.agency.name}
            </span>
            <h4 className="font-extrabold text-slate-900 text-sm leading-tight pr-6">
              {project.title}
            </h4>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-slate-500">
           <UserIcon className="w-3 h-3 text-slate-300" />
           <span className="text-xs font-bold uppercase tracking-tight">{project.client.name}</span>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1.5 text-slate-900 font-black bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
             <DollarSign className="w-3 h-3 text-emerald-500" />
             <span className="text-xs">
                {displayPrice ? `${(displayPrice / 1000).toFixed(1)}k` : "--"}
             </span>
          </div>
          
          <div className="p-1 px-2 text-slate-300 font-bold text-[10px] group-hover:text-slate-800 flex items-center gap-1 transition-all">
             <Maximize2 className="w-3 h-3" /> Ver detalhes
          </div>
        </div>
      </div>
    </div>
  );
}
