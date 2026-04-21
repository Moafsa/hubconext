"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { updateProjectStatus, getProjects, getProjectInfo } from "@/app/actions/db-actions";
import { ProjectDetailModal } from "./ProjectDetailModal";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const COLUMNS = [
  { id: "UNDER_REVIEW", title: "Em Revisão" },
  { id: "AWAITING_AGENCY_ACCEPTANCE", title: "Aceite da Agência" },
  { id: "NEGOTIATING", title: "Negociação" },
  { id: "WAITING_INITIAL_PAY", title: "Pagamento 50%" },
  { id: "WAITING_BRIEFING", title: "Briefing" },
  { id: "IN_DEVELOPMENT", title: "Produção" },
  { id: "TESTING", title: "Homologação" },
  { id: "DELIVERED", title: "Concluído" },
];

export function KanbanBoard({ initialProjects }: { initialProjects: any[] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [projects, setProjects] = useState(initialProjects);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const refreshProjects = async () => {
    // Buscar agência se for usuário de agência, ou todos se for admin
    const userRole = (session?.user as any)?.role;
    const agencyId = (session?.user as any)?.agencyId;
    const updated = await getProjects(userRole === 'CONEXT_ADMIN' ? null : agencyId);
    setProjects(updated);
    
    // Se o modal estiver aberto, atualizar as infos dele também
    if (selectedProject) {
      const updatedInfo = await getProjectInfo(selectedProject.id);
      setSelectedProject(updatedInfo);
    }
  };

  function onDragStart(event: DragStartEvent) {
    const { active } = event;
    const project = projects.find((p) => p.id === active.id);
    setActiveProject(project);
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const projectId = active.id as string;
    const overId = over.id as string;

    const isOverAColumn = COLUMNS.some(col => col.id === overId);
    let newStatus = isOverAColumn ? overId : projects.find(p => p.id === overId)?.status;

    if (newStatus && activeProject.status !== newStatus) {
      const result = await updateProjectStatus(projectId, newStatus);
      if (result.success) {
        refreshProjects();
        if (result.message) alert(result.message);
      } else {
        alert("Erro ao mover: " + result.error);
      }
    }

    setActiveProject(null);
  }

  if (!mounted) return <div className="flex gap-6 overflow-x-auto pb-10 min-h-[calc(100vh-200px)] animate-pulse bg-slate-50/50 rounded-3xl" />;

  return (

    <div className="flex gap-6 overflow-x-auto pb-10 min-h-[calc(100vh-200px)] relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            projects={projects.filter((p) => p.status === column.id)}
            onCardClick={async (p) => {
              // Buscar info completa ao abrir o modal para garantir histórico de chat
              const fullInfo = await getProjectInfo(p.id);
              setSelectedProject(fullInfo || p);
            }}
            onUpdate={refreshProjects}
          />
        ))}

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: "0.5" } },
          }),
        }}>
          {activeProject ? (
            <KanbanCard 
              project={activeProject} 
              onClick={() => {}} 
              onUpdate={() => {}} 
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de Detalhes do Projeto */}
      {selectedProject && (
        <ProjectDetailModal 
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={refreshProjects}
          currentUserId={(session?.user as any)?.id}
          userRole={(session?.user as any)?.role}
          userName={session?.user?.name || "Usuário"}
        />
      )}
    </div>
  );
}
