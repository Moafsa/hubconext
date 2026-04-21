"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Monitor, 
  Layout, 
  Cpu, 
  Zap, 
  Palette, 
  Globe,
  User as UserIcon,
  Link as LinkIcon,
  Shield,
  FileText,
  Sparkles,
  CheckCircle2,
  DollarSign,
  Calendar,
  Loader2
} from "lucide-react";
import { generateDetailedBriefing, generateProjectScope, generateAssetChecklist } from "@/app/actions/ai-actions";
import { createProject } from "@/app/actions/db-actions";
import { useRouter } from "next/navigation";
import { WizardFileUpload } from "./WizardFileUpload";

const PROJECT_TYPES = [
  { id: "WEBSITE", title: "Website", desc: "Site institucional completo", icon: Globe, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "LANDING_PAGE", title: "Landing Page", desc: "Página de conversão focada", icon: Layout, color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "SYSTEM", title: "Sistema Web", desc: "Dashboard ou App customizado", icon: Monitor, color: "text-indigo-500", bg: "bg-indigo-50" },
  { id: "AUTOMATION", title: "Automação", desc: "Fluxos inteligentes e APIs", icon: Cpu, color: "text-amber-500", bg: "bg-amber-50" },
  { id: "LOGO", title: "Logo & Marca", desc: "Identidade visual completa", icon: Palette, color: "text-rose-500", bg: "bg-rose-50" },
  { id: "OTHER", title: "Outro", desc: "Demanda especializada", icon: Zap, color: "text-slate-500", bg: "bg-slate-50" },
];

export function NewProjectWizard({ agencyId, onClose }: { agencyId: string, onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "WEBSITE",
    title: "",
    description: "",
    clientName: "",
    clientEmail: "",
    clientWhatsapp: "",
    proposedPrice: "",
    requestedDeadline: "",  // Prazo que a agência solicita
    briefing: {
      objective: "",
      functionalities: "",
      integrations: "",
      assetChecklist: [] as string[],
      references: [""] as string[],
      colors: "",
      hasKeys: "pending", 
    },
    credentials: "",
    technicalScope: "",
    contractText: "",
    suggestedTech: "",
  });

  const [finished, setFinished] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, key: string, type: string, size: number}[]>([]);
  const uploadPath = `wizard/${agencyId}/${Date.now()}`;

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleAIPhase = async () => {
    setLoading(true);
    setStep(5); // Ir para o passo de IA (Loading)
    
    try {
      const detailedBriefing = await generateDetailedBriefing({
        type: formData.type,
        title: formData.title,
        description: formData.description,
        briefing: {
          ...formData.briefing,
          requestedDeadline: formData.requestedDeadline,
        },
        suggestedTech: formData.suggestedTech,
        proposedPrice: parseFloat(formData.proposedPrice as any) || 0,
      });

      const scope = await generateProjectScope({ 
        type: formData.type, 
        title: formData.title, 
        briefing: { 
          ...formData.briefing, 
          description: formData.description 
        } 
      });
      
      const checklist = await generateAssetChecklist({ type: formData.type });
      
      setFormData(prev => ({
        ...prev,
        technicalScope: scope,
        briefing: {
          ...prev.briefing,
          assetChecklist: checklist,
          detailedBriefing,
        }
      }));

      // Atraso artificial para efeito de "IA processando"
      setTimeout(() => {
        setLoading(false);
        setStep(6);
      }, 2500);
    } catch (error) {
      alert("Erro ao processar com IA. Tente novamente.");
      setLoading(false);
      setStep(4);
    }
  };

  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    if (!agencyId) {
      alert("Erro: ID da agência não encontrado. Tente recarregar a página.");
      return;
    }
    
    // Iniciar Transição (React 18/19 padrão p/ Server Actions)
    startTransition(async () => {
        try {
            setLoading(true);
            const references = formData.briefing?.references || [];
            const cleanedReferences = references.filter(r => r && typeof r === 'string' && r.trim() !== "");
      
            console.log("Iniciando submissão do projeto (OPERAÇÃO API-SHIELD)...", { ...formData, agencyId });
      
            const response = await fetch("/api/projects/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    proposedPrice: parseFloat(formData.proposedPrice as any) || 0,
                    agencyId,
                    suggestedTech: formData.suggestedTech,
                    briefing: {
                      ...formData.briefing,
                      references: cleanedReferences,
                      requestedDeadline: formData.requestedDeadline,
                      wizardFiles: (uploadedFiles || []).map(f => ({ name: f.name, key: f.key, type: f.type, size: f.size })),
                    },
                })
            });
      
            const result = await response.json();
      
            if (result.success) {
              setFinished(true);
              // Pequeno delay para feedback visual antes do reload
              setTimeout(() => {
                window.location.reload(); 
              }, 1500);
            } else {
              alert("Erro ao criar projeto: " + (result.error || "Erro desconhecido"));
              setLoading(false);
            }
        } catch (err: any) {
            console.error("CRASH NO SUBMIT:", err);
            alert("Erro crítico ao finalizar: " + err.message);
            setLoading(false);
        }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      
      <div className="w-full max-w-4xl bg-white h-[min(900px,90vh)] max-h-[900px] rounded-[32px] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-500">
        
        {/* Sidebar - Progress indicator */}
        <div className="md:w-72 bg-slate-50 border-r border-slate-100 p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-10">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
               </div>
               <span className="font-black text-slate-800 tracking-tight">Orquestrador</span>
            </div>

            <div className="space-y-6">
               <StepIndicator current={step} target={1} label="Identidade" />
               <StepIndicator current={step} target={2} label="Cliente" />
               <StepIndicator current={step} target={3} label="A Mente" />
               <StepIndicator current={step} target={4} label="O Bunker" />
               <StepIndicator current={step} target={5} label="IA Scoping" />
               <StepIndicator current={step} target={6} label="Revisão" />
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
             Gerido por Conext Hub
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 p-8 md:p-12 overflow-y-auto">
             
             {/* Step 1: Type Selection */}
             {step === 1 && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">O que vamos construir?</h2>
                  <p className="text-slate-500 font-medium mb-10">Selecione o tipo de projeto para iniciarmos o orquestrador.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {PROJECT_TYPES.map((type) => (
                       <button
                        key={type.id}
                        onClick={() => { setFormData({...formData, type: type.id}); nextStep(); }}
                        className={`
                          p-6 rounded-3xl border-2 text-left transition-all group
                          ${formData.type === type.id ? "border-blue-600 bg-blue-50/10" : "border-slate-100 hover:border-slate-200"}
                        `}
                       >
                         <div className={`w-12 h-12 ${type.bg} ${type.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            <type.icon className="w-6 h-6" />
                         </div>
                         <h4 className="font-black text-slate-800 mb-1">{type.title}</h4>
                         <p className="text-xs text-slate-400 font-bold leading-none uppercase">{type.desc}</p>
                       </button>
                     ))}
                  </div>
               </div>
             )}

             {/* Step 2: Client Info */}
             {step === 2 && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Para quem é o projeto?</h2>
                  <p className="text-slate-500 font-medium mb-10">Precisamos saber quem é o dono do sonho.</p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome do Projeto</label>
                      <input 
                        className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                        placeholder="Ex: Landing Page Clínica Sorriso"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome do Cliente Final</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                        <input 
                          className="w-full bg-slate-50 border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                          placeholder="Quem vai assinar?"
                          value={formData.clientName}
                          onChange={e => setFormData({...formData, clientName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">E-mail de Contato</label>
                      <input 
                        className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                        placeholder="cliente@email.com"
                        value={formData.clientEmail}
                        onChange={e => setFormData({...formData, clientEmail: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">WhatsApp / Telefone do Cliente (para OTP)</label>
                      <input 
                        className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                        placeholder="Ex: 55DDDNÚMERO (sem +)"
                        value={(formData as any).clientWhatsapp}
                        onChange={e => setFormData({...formData, clientWhatsapp: e.target.value})}
                      />
                      <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Use apenas números (país+DDD+número), sem espaços.
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Contexto / Descrição Geral</label>
                      <textarea 
                        className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium focus:bg-white transition-all shadow-inner h-24"
                        placeholder="Resuma o projeto em uma frase ou parágrafo curto..."
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                      />
                    </div>
                  </div>
               </div>
             )}

             {/* Step 3: Strategic Interview */}
             {step === 3 && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Entrevista Estratégica</h2>
                  <p className="text-slate-500 font-medium mb-10">IA Orquestradora: "Vamos montar o escopo técnico perfeito."</p>
                  
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Qual o Objetivo Central?</label>
                          <textarea 
                            className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium focus:bg-white transition-all shadow-inner h-24"
                            placeholder="Ex: Vencer a concorrência em SEO, vender 100 mentorias..."
                            value={formData.briefing.objective}
                            onChange={e => setFormData({...formData, briefing: {...formData.briefing, objective: e.target.value}})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Funcionalidades Essenciais</label>
                          <textarea 
                            className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium focus:bg-white transition-all shadow-inner h-24"
                            placeholder="Ex: Checkout transparente, área de membros, blog..."
                            value={formData.briefing.functionalities}
                            onChange={e => setFormData({...formData, briefing: {...formData.briefing, functionalities: e.target.value}})}
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Integrações (APIs, CRM, etc)</label>
                          <textarea 
                            className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium focus:bg-white transition-all shadow-inner h-24"
                            placeholder="Ex: RD Station, Pagar.me, Google Calendar..."
                            value={formData.briefing.integrations}
                            onChange={e => setFormData({...formData, briefing: {...formData.briefing, integrations: e.target.value}})}
                          />
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Já possui as chaves/acessos?</label>
                          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                             {[
                               { id: "now", label: "Sim, agora" },
                               { id: "later", label: "Envio depois" },
                               { id: "pending", label: "Não tenho" }
                             ].map((opt) => (
                               <button
                                 key={opt.id}
                                 onClick={() => setFormData({...formData, briefing: {...formData.briefing, hasKeys: opt.id}})}
                                 className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${formData.briefing.hasKeys === opt.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                               >
                                 {opt.label}
                               </button>
                             ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-8">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 flex items-center justify-between">
                         Referências (Links)
                         <button 
                          onClick={() => setFormData({...formData, briefing: {...formData.briefing, references: [...formData.briefing.references, ""]}})}
                          className="text-blue-600 hover:text-blue-700 normal-case"
                         >
                           + Adicionar Link
                         </button>
                       </label>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.briefing.references.map((ref, idx) => (
                            <div key={idx} className="relative">
                               <LinkIcon className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                               <input 
                                 className="w-full bg-slate-50 border-slate-200 rounded-2xl pl-12 pr-12 py-4 text-sm focus:bg-white transition-all shadow-inner"
                                 placeholder="url-exemplo.com"
                                 value={ref}
                                 onChange={e => {
                                   const newRefs = [...formData.briefing.references];
                                   newRefs[idx] = e.target.value;
                                   setFormData({...formData, briefing: {...formData.briefing, references: newRefs}});
                                 }}
                               />
                               {idx > 0 && (
                                 <button 
                                  onClick={() => {
                                    const newRefs = formData.briefing.references.filter((_, i) => i !== idx);
                                    setFormData({...formData, briefing: {...formData.briefing, references: newRefs}});
                                  }}
                                  className="absolute right-4 top-4 text-slate-300 hover:text-rose-500"
                                 >
                                    <X className="w-4 h-4" />
                                 </button>
                               )}
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
               </div>
             )}

             {/* Step 4: Vault */}
             {step === 4 && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">O Bunker de Acessos</h2>
                  <p className="text-slate-500 font-medium mb-10">Senhas, chaves de API e acessos sensíveis ficam guardados aqui.</p>
                  
                  <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex items-start gap-4 mb-8">
                     <Shield className="w-8 h-8 text-amber-500 flex-shrink-0" />
                     <div>
                        <h4 className="font-bold text-amber-800 text-sm">Privacidade Garantida</h4>
                        <p className="text-xs text-amber-700 leading-relaxed">Essas informações são visíveis apenas para o Super Admin e Agência. Não aparecerão para o cliente final.</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Documentos & Arquivos do Projeto</label>
                       <WizardFileUpload 
                         projectPath={uploadPath}
                         onFilesChange={setUploadedFiles}
                       />
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sugestão de Valor (R$)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                            <input 
                              type="number"
                              className="w-full bg-slate-50 border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-black focus:bg-white transition-all shadow-inner"
                              placeholder="0.00"
                              value={formData.proposedPrice}
                              onChange={e => setFormData({...formData, proposedPrice: e.target.value})}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Prazo Solicitado</label>
                          <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest mb-2">⚡ O prazo definitivo será definido por nós</p>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                            <input 
                              type="date"
                              className="w-full bg-slate-50 border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                              value={formData.requestedDeadline}
                              onChange={e => setFormData({...formData, requestedDeadline: e.target.value})}
                            />
                          </div>
                        </div>
                     </div>

                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tecnologia ou Plataforma Suportada / Sugerida</label>
                        <input 
                           className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                           placeholder="Ex: WordPress, React + Node, Bubble, Automação n8n..."
                           value={formData.suggestedTech}
                           onChange={e => setFormData({...formData, suggestedTech: e.target.value})}
                        />
                     </div>
                   </div>
               </div>
             )}

             {/* Step 5: IA Loading */}
             {step === 5 && (
               <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                  <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8 relative">
                     <div className="absolute inset-0 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                     <Sparkles className="w-10 h-10 text-blue-600 animate-pulse" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-4 italic">Orchestrating...</h2>
                  <p className="text-slate-500 font-medium max-w-sm">Minha IA está lendo o que você escreveu para gerar o Escopo Técnico e o Contrato Profissional automaticamente.</p>
               </div>
             )}

             {/* Step 6: Review and Contract */}
             {step === 6 && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Revisão do Orquestrador</h2>
                  <p className="text-slate-500 font-medium mb-10">Tudo pronto! Aqui está a proposta formal gerada.</p>
                  
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[400px]">
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Cpu className="w-3 h-3" /> Escopo Técnico (IA)
                         </span>
                         <div className="flex-1 bg-slate-50 rounded-3xl p-6 border border-slate-200 overflow-y-auto custom-scrollbar prose prose-sm prose-slate font-medium text-slate-700">
                            <pre className="whitespace-pre-wrap font-sans text-xs">{formData.technicalScope}</pre>
                         </div>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Zap className="w-3 h-3" /> Material Necessário
                         </span>
                         <div className="flex-1 bg-emerald-50 rounded-3xl p-6 border border-emerald-100 overflow-y-auto">
                            <ul className="space-y-3">
                               {formData.briefing.assetChecklist?.map((item, i) => (
                                 <li key={i} className="flex items-start gap-2 text-xs font-bold text-emerald-800">
                                    <div className="w-4 h-4 rounded bg-emerald-200 flex items-center justify-center mt-0.5 shrink-0">
                                       <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                                    </div>
                                    {item}
                                 </li>
                               ))}
                            </ul>
                         </div>
                      </div>
                   </div>
               </div>
             )}

          </div>

          {/* Footer Navigation */}
          {step !== 5 && (
            <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-white">
               <button 
                 type="button"
                 onClick={prevStep}
                 disabled={step === 1 || loading || isPending}
                 className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 disabled:opacity-0 transition-all"
               >
                 <ChevronLeft className="w-4 h-4" /> Voltar
               </button>

               {step < 4 ? (
                 <button 
                  type="button"
                  onClick={nextStep}
                  disabled={!formData.title && step === 2}
                  className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                 >
                   Continuar <ChevronRight className="w-4 h-4" />
                 </button>
               ) : step === 4 ? (
                 <button 
                  type="button"
                  onClick={handleAIPhase}
                  className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                 >
                   Orquestrar com IA <Sparkles className="w-4 h-4" />
                 </button>
               ) : (
                 <button 
                  type="button"
                  onClick={(e) => handleSubmit(e)}
                  disabled={loading || finished || isPending}
                  className={`
                    px-10 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-2 shadow-lg
                    ${finished ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20"}
                    ${(loading || isPending) ? "opacity-90 cursor-wait bg-emerald-700" : ""}
                  `}
                 >
                   {finished ? (
                     <>Projeto Criado! <CheckCircle2 className="w-5 h-5 animate-bounce" /></>
                   ) : (loading || isPending) ? (
                     <>Criando Projeto... <Loader2 className="w-4 h-4 animate-spin" /></>
                   ) : (
                     <>Finalizar Projeto <CheckCircle2 className="w-4 h-4" /></>
                   )}
                 </button>
               )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

function StepIndicator({ current, target, label }: { current: number, target: number, label: string }) {
  const active = current === target;
  const done = current > target;
  
  return (
    <div className={`flex items-center gap-4 transition-all ${active ? "opacity-100" : "opacity-40"}`}>
       <div className={`
         w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black border-2
         ${done ? "bg-emerald-500 border-emerald-500 text-white" : active ? "border-blue-600 text-blue-600" : "border-slate-300 text-slate-300"}
       `}>
          {done ? <CheckCircle2 className="w-3 h-3" /> : target}
       </div>
       <span className={`text-xs font-black uppercase tracking-widest ${active ? "text-slate-800" : "text-slate-400"}`}>{label}</span>
    </div>
  );
}
