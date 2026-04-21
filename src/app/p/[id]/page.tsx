import { getProjectInfo } from "@/app/actions/db-actions";
import { ProjectDropzone } from "@/components/ProjectDropzone";
import { ProjectChat } from "@/components/ProjectChat";
import { notFound } from "next/navigation";
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShieldCheck, 
  Monitor,
  Cpu,
  Zap,
  Layout,
  Palette,
  Globe,
  MessageCircle
} from "lucide-react";

export default async function ProjectPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectInfo(id);

  if (!project) {
    notFound();
  }

  const { agency, client, status, comments } = project;
  const agencyColor = agency.primaryColor || "#3b82f6";
  const agencyLogo = agency.logoUrl;

  const steps = [
    { id: "NEGOTIATING", label: "Alinhamento", icon: Clock },
    { id: "WAITING_BRIEFING", label: "Briefing", icon: FileText },
    { id: "IN_DEVELOPMENT", label: "Produção", icon: Cpu },
    { id: "TESTING", label: "Homologação", icon: Zap },
    { id: "DELIVERED", label: "Entrega", icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === status);
  
  const typeIcons: any = {
    WEBSITE: Globe,
    LANDING_PAGE: Layout,
    SYSTEM: Monitor,
    AUTOMATION: Cpu,
    LOGO: Palette,
    OTHER: Zap
  };
  const TypeIcon = typeIcons[project.type as any] || Zap;

  // Filtrar apenas comentários visíveis para o cliente
  const visibleComments = comments.filter(c => c.isVisibleToClient);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4 md:py-12 md:px-6 font-sans">
      
      <div className="w-full max-w-7xl flex flex-col gap-6">
        
        {/* Header White-Label Card */}
        <div className="w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
          
          {/* Lado Esquerdo: Progresso e Branding */}
          <div className="md:w-1/4 bg-slate-900 p-8 md:p-10 text-white flex flex-col justify-between">
            <div>
              <div className="mb-12">
                {agencyLogo ? (
                  <img src={agencyLogo} alt={agency.name} className="max-h-16 w-auto object-contain" />
                ) : (
                  <div className="text-2xl font-black italic tracking-tighter" style={{ color: agencyColor }}>
                    {agency.name}
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {steps.map((step, idx) => {
                  const isPast = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <div key={step.id} className={`flex items-center gap-4 transition-all ${isPast || isCurrent ? "opacity-100" : "opacity-30"}`}>
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                        ${isPast ? "bg-emerald-500 border-emerald-500 text-white" : isCurrent ? "border-white animate-bounce shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "border-slate-700 text-slate-700"}
                      `}>
                        {isPast ? <CheckCircle2 className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? "text-white" : "text-slate-500"}`}>
                          {step.label}
                        </p>
                        {isCurrent && <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-tighter">Status Atual</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-20 pt-10 border-t border-slate-800">
               <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Ambiente Blindado
               </div>
            </div>
          </div>

          {/* Lado Direito: Conteúdo Principal */}
          <div className="flex-1 p-8 md:p-12">
            
            <div className="mb-12">
               <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-slate-100 rounded-lg">
                     <TypeIcon className="w-5 h-5 text-slate-600" />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                     {project.type.replace(/_/g, " ")}
                  </span>
               </div>
               <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-4">
                  Seu portal de<br/>projeto está pronto.
               </h1>
               <p className="text-slate-500 text-lg max-w-2xl leading-relaxed">
                  Olá, <span className="text-slate-900 font-bold">{client.name}</span>! Acompanhe o progresso da sua <span className="font-bold text-slate-900">{project.title}</span> e envie os materiais necessários abaixo.
               </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* Coluna 1: Materiais e Escopo */}
              <div className="space-y-10">
                <section>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
                      <Zap className="w-5 h-5 text-amber-500" /> Envio de Materiais
                  </h3>
                  <ProjectDropzone 
                    projectPath={`${agency.name}/${client.name}/${project.id}/assets`} 
                    themeColor={agencyColor} 
                    agencyName={agency.name} 
                    projectId={project.id}
                  />
                </section>

                {project.technicalScope && (
                  <section className="bg-slate-50 rounded-[32px] border border-slate-100 p-8 shadow-inner">
                    <h3 className="text-md font-black text-slate-800 mb-4 flex items-center gap-2">
                       <FileText className="w-5 h-5 text-blue-600" /> Resumo do Escopo Técnico
                    </h3>
                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-slate-500 leading-relaxed italic">
                        {project.technicalScope}
                      </pre>
                    </div>
                  </section>
                )}
              </div>

              {/* Coluna 2: Chat */}
              <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-indigo-500" /> Chat do Projeto
                </h3>
                <ProjectChat 
                  projectId={project.id} 
                  initialComments={visibleComments} 
                  themeColor={agencyColor}
                  clientName={client.name}
                />
              </div>

            </div>

          </div>

        </div>

        <footer className="text-center py-6">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
            White-Label Dashboard • Powered by Conext Hub • Desenvolvido para {agency.name}
          </p>
        </footer>

      </div>

    </div>
  );
}
