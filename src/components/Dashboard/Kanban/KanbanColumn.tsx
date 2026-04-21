"use client";

import { useDroppable } from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  id: string;
  title: string;
  projects: any[];
  onCardClick: (project: any) => void;
  onUpdate: () => void;
}

export function KanbanColumn({ id, title, projects, onCardClick, onUpdate }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="flex flex-col w-72 min-w-72 bg-slate-100/50 rounded-2xl p-4 border border-slate-200/60 h-[calc(100vh-210px)]">
      <div className="flex items-center justify-between mb-4 px-1 shrink-0">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          {title}
          <span className="w-5 h-5 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
            {projects.length}
          </span>
        </h3>
      </div>

      <div ref={setNodeRef} className="flex-1 flex flex-col overflow-y-auto pr-1">
        <SortableContext 
          id={id}
          items={projects.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((project) => (
            <KanbanCard 
              key={project.id} 
              project={project} 
              onClick={() => onCardClick(project)} 
              onUpdate={onUpdate}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
