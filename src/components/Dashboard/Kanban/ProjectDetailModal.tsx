"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, 
  FileText, 
  History as HistoryIcon, 
  MessageSquare, 
  Download, 
  Send,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Building,
  User as UserIcon,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Plus,
  Flag,
  Loader2,
  Link as LinkIcon,
  Check,
  Share2,
  CreditCard,
  RotateCcw,
  Monitor,
  ChevronDown,
  ChevronUp,
  Settings,
  Layout,
  Target,
  Zap,
  Globe,
  ExternalLink,
  Edit2,
  Save
} from "lucide-react";
import { 
  addProjectComment, 
  deleteProject, 
  updateProjectAIContent, 
  approveProject, 
  acceptProjectContract,
  acceptProjectBriefing,
  updateProjectBriefingData,
  updateProjectTech,
  syncProjectFromChat,
  restoreProjectSnapshot,
  updateProjectPricing,
  generateInstallments,
  updatePaymentStatus,
  deleteProjectFile
} from "@/app/actions/db-actions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProjectDropzone } from "@/components/ProjectDropzone";

interface ProjectDetailModalProps {
  project: any;
  onClose: () => void;
  onUpdate: () => void;
  currentUserId: string;
  userRole?: string;
  userName?: string;
}

export function ProjectDetailModal({ project, onClose, onUpdate, currentUserId, userRole, userName = "Usuário" }: ProjectDetailModalProps) {
  const isAgencyStaff = userRole?.toUpperCase() === "AGENCY_USER" || userRole?.toUpperCase() === "AGENCY_ADMIN";
  const isAgencyAdmin = userRole?.toUpperCase() === "AGENCY_ADMIN";
  const [activeTab, setActiveTab] = useState<"briefing" | "milestones" | "timeline" | "chat" | "finance">("briefing");
  const [commentText, setCommentText] = useState("");
  const [isPublicComment, setIsPublicComment] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filesBaseUrl = (process.env.NEXT_PUBLIC_FILES_BASE_URL || "").trim();
  const getFileUrl = (key: string) => {
    if (!filesBaseUrl) return `/${key.replace(/^\/+/, "")}`;
    const base = filesBaseUrl.replace(/\/+$/, "");
    const k = String(key || "").replace(/^\/+/, "");
    return `${base}/${k}`;
  };

  const handleDeleteProjectFile = async (fileId: string, filename: string) => {
    if (!confirm(`Excluir o arquivo "${filename}"?`)) return;
    setIsSubmitting(true);
    const res = await deleteProjectFile(fileId, userName);
    setIsSubmitting(false);
    if (!(res as any).success) {
      alert("Erro ao excluir arquivo: " + ((res as any).error || "Erro desconhecido"));
      return;
    }
    onUpdate();
  };
  
  // Estados de Edição (Admin)
  const [isEditingScope, setIsEditingScope] = useState(false);
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editScope, setEditScope] = useState(project.technicalScope || "");
  const [editContract, setEditContract] = useState(project.contractText || "");
  const [editDescription, setEditDescription] = useState(project.description || "");

  const [materialLinkInput, setMaterialLinkInput] = useState("");
  const [materialLinks, setMaterialLinks] = useState<string[]>([]);
  const [savingMaterialLinks, setSavingMaterialLinks] = useState(false);

  // Auxiliar para garantir que o briefing seja tratado como objeto de forma resiliente
  function getSafeBriefing(rawBriefing: any) {
    if (!rawBriefing) return {};
    try {
      if (typeof rawBriefing === 'string') return JSON.parse(rawBriefing);
      return rawBriefing;
    } catch (e) {
      console.error("Erro ao tratar briefing:", e);
      return {};
    }
  }

  const briefing = getSafeBriefing(project.briefing);
  const hasAcceptedContract = Boolean((briefing as any)?.agencyAcceptedContractAt);

  // Helper para extração resiliente de dados do briefing (suporta flat e nested da IA)
  const getNested = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const projectSummary = briefing?.projectSummary || {};
  const displayDescription = project.description || projectSummary.description || briefing?.description || "";
  const displayObjective = projectSummary.objective || briefing?.objective || "";
  
  const rawFuncs = briefing?.requirements?.functional || briefing?.scope?.inScope || briefing?.functionalities;
  const displayFunctionalities = Array.isArray(rawFuncs) ? rawFuncs.join('\n') : (rawFuncs || "");
  
  const rawInts = briefing?.integrations?.systems || briefing?.integrations;
  const displayIntegrations = Array.isArray(rawInts) ? rawInts.join('\n') : (rawInts || "");
  
  const rawRefs = briefing?.contentAndBrand?.references || briefing?.references || [];
  const displayReferences = Array.isArray(rawRefs) ? rawRefs : (typeof rawRefs === 'string' ? [rawRefs] : []);

  useEffect(() => {
    setEditScope(project.technicalScope || "");
    setEditContract(project.contractText || "");
    setEditDescription(project.description || "");
    const b = getSafeBriefing(project.briefing);
    const raw = b?.agencyMaterialLinks;
    setMaterialLinks(Array.isArray(raw) ? raw.filter((x: unknown) => typeof x === "string") as string[] : []);
  }, [project.id, project.technicalScope, project.contractText, project.briefing, project.description]);

  // Marcos de entrega (Milestones)
  type Milestone = { id: string; label: string; date: string; done: boolean };
  const existingMilestones: Milestone[] = briefing?.milestones || [];
  const [milestones, setMilestones] = useState<Milestone[]>(existingMilestones);
  const [savingMilestones, setSavingMilestones] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditingTech, setIsEditingTech] = useState(false);
  const [tempTech, setTempTech] = useState(project.suggestedTech || "");
  
  // Estados Financeiros
  const [showInstallmentsForm, setShowInstallmentsForm] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [agreedPrice, setAgreedPrice] = useState(project.agreedPrice || project.proposedPrice || 0);

  // Estados de Snapshots
  const [showSnapshots, setShowSnapshots] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const agencyColor = project.agency.primaryColor || "#3b82f6";

  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTab, project.comments]);

  // Polling para novas mensagens quando o chat está aberto
  useEffect(() => {
    if (activeTab !== "chat") return;

    const interval = setInterval(() => {
      onUpdate(); // Isso dispara o refreshProjects no KanbanBoard que por sua vez atualiza o modal
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [activeTab]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    const res = await addProjectComment(project.id, commentText, currentUserId, isPublicComment);
    if (res.success) {
      setCommentText("");
      onUpdate();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir este projeto permanentemente?")) {
      const res = await deleteProject(project.id);
      if (res.success) {
        onClose();
        onUpdate();
      }
    }
  };

  const handleSaveAIContent = async (type: 'scope' | 'contract') => {
    setIsSubmitting(true);
    const data = type === 'scope' ? { technicalScope: editScope } : { contractText: editContract };
    const res = await updateProjectAIContent(project.id, data, currentUserId, userName);
    if (res.success) {
      if (type === 'scope') setIsEditingScope(false);
      else setIsEditingContract(false);
      onUpdate();
    }
    setIsSubmitting(false);
  };

  const addMaterialLink = () => {
    const v = materialLinkInput.trim();
    if (!v) return;
    setMaterialLinks((prev) => [...prev, v]);
    setMaterialLinkInput("");
  };

  const removeMaterialLink = (idx: number) => {
    setMaterialLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveMaterialLinks = async () => {
    setSavingMaterialLinks(true);
    const base = getSafeBriefing(project.briefing);
    const cleaned = materialLinks.map((s) => s.trim()).filter(Boolean);
    const updatedBriefing = { ...base, agencyMaterialLinks: cleaned };
    const res = await updateProjectBriefingData(project.id, updatedBriefing, userName);
    setSavingMaterialLinks(false);
    if (!(res as any).success) {
      alert("Erro ao salvar links: " + ((res as any).error || "Erro desconhecido"));
      return;
    }
    onUpdate();
  };

  const handleApprove = async () => {
    if (!confirm("Isso liberará o projeto para aceite da agência. Continuar?")) return;
    setIsSubmitting(true);
    const res = await approveProject(project.id, userName);
    if (res.success) onUpdate();
    setIsSubmitting(false);
  };

  const handleAccept = async () => {
    if (!confirm("Ao aceitar, você concorda com o escopo técnico e contrato gerados. Continuar?")) return;
    setIsSubmitting(true);
    const res = await acceptProjectContract(project.id, userName);
    if ((res as any).success) {
      alert("Contrato aceito! Desenvolvimento liberado para a Conext.");
      onUpdate();
    } else {
      alert("Erro ao aceitar contrato: " + ((res as any).error || "Erro desconhecido"));
    }
    setIsSubmitting(false);
  };

  const handleAcceptBriefing = async () => {
    if (!confirm("Ao aceitar, você concorda com o briefing e materiais definidos. Continuar?")) return;
    setIsSubmitting(true);
    const res = await acceptProjectBriefing(project.id, userName);
    if ((res as any).success) onUpdate();
    else alert("Erro ao aceitar briefing: " + ((res as any).error || "Erro desconhecido"));
    setIsSubmitting(false);
  };


  // --- Milestone Handlers ---

  const handleSaveMilestones = async () => {
    setSavingMilestones(true);
    const updatedBriefing = { ...(project.briefing || {}), milestones };
    const res = await updateProjectBriefingData(project.id, updatedBriefing, userName);
    if (res.success) onUpdate();
    setSavingMilestones(false);
  };

  const addMilestone = () => {
    setMilestones((prev: any[]) => [...prev, { id: Date.now().toString(), label: "", date: "", done: false }]);
  };

  const removeMilestone = (id: string) => setMilestones((prev: any[]) => prev.filter((m: any) => m.id !== id));

  const updateMilestone = (id: string, field: string, value: string | boolean) => {
    setMilestones((prev: any[]) => prev.map((m: any) => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleCopyPortalLink = () => {
    const url = `${window.location.origin}/p/${project.id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleUpdateTech = async () => {
    const res = await updateProjectTech(project.id, tempTech, userName);
    if (res.success) {
      setIsEditingTech(false);
      onUpdate();
    }
  };

  const handleSyncFromChat = async () => {
    if (!confirm("O Orquestrador de IA irá analisar toda a conversa e atualizar o briefing e contrato. Continuar?")) return;
    setIsSyncing(true);
    const res = await syncProjectFromChat(project.id, userName);
    setIsSyncing(false);
    if (res.success) {
      alert("Sincronização concluída com sucesso!");
      onUpdate();
    }
  };

  const handleUpdatePrice = async () => {
    setIsSubmitting(true);
    await updateProjectPricing(project.id, { agreedPrice }, userName);
    onUpdate();
    setIsSubmitting(false);
  };

  const handleGenerateInstallments = async () => {
    setIsSubmitting(true);
    await generateInstallments(project.id, installmentCount, firstDueDate, userName);
    onUpdate();
    setShowInstallmentsForm(false);
    setIsSubmitting(false);
  };

  const handleUpdatePayment = async (paymentId: string, status: string) => {
    await updatePaymentStatus(paymentId, status, userName);
    onUpdate();
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!confirm("Isso irá substituir o escopo e contrato atual pela versão selecionada. Continuar?")) return;
    setIsSubmitting(true);
    const res = await restoreProjectSnapshot(snapshotId, userName || "Admin");
    if (res.success) {
      alert("Versão restaurada com sucesso!");
      onUpdate();
    }
    setIsSubmitting(false);
  };

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end bg-slate-900/40 backdrop-blur-sm transition-all animate-in fade-in duration-300">
      
      {/* Drawer Panel */}
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <span 
                   className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                   style={{ backgroundColor: `${agencyColor}15`, color: agencyColor }}
                 >
                   {project.status.replace(/_/g, " ")}
                 </span>
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">{project.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {/* Botões de Ação Dinâmica */}
             {userRole === 'CONEXT_ADMIN' && project.status === 'UNDER_REVIEW' && (
               <button 
                 onClick={handleApprove}
                 disabled={isSubmitting}
                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
               >
                 <CheckCircle2 className="w-4 h-4" /> Finalizar Revisão
               </button>
             )}

            {isAgencyStaff && project.status === 'AWAITING_AGENCY_ACCEPTANCE' && (
              <>
                <button 
                  onClick={handleAcceptBriefing}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl text-xs font-black hover:bg-slate-50 transition-all shadow-lg shadow-slate-100 border border-slate-200"
                  title="Aceitar briefing do projeto"
                >
                  <FileText className="w-4 h-4 text-emerald-600" /> Aceitar Briefing
                </button>
                <button 
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  title="Aceitar contrato do projeto"
                >
                  <CheckCircle2 className="w-4 h-4" /> Aceitar Contrato
                </button>
              </>
            )}

             <button 
               onClick={handleCopyPortalLink}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg ${
                 isCopied 
                  ? "bg-emerald-500 text-white shadow-emerald-200" 
                  : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-slate-100"
               }`}
               title="Copiar Link do Portal do Cliente"
             >
               {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4 text-blue-500" />}
               {isCopied ? "Link Copiado!" : "Compartilhar Portal"}
             </button>

             {(userRole?.toUpperCase() === 'CONEXT_ADMIN' || isAgencyAdmin) && (
               <button 
                 onClick={handleSyncFromChat}
                 disabled={isSyncing}
                 className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                 title="Sincronizar Briefing/Contrato com base no Chat e Contexto"
               >
                 {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                 {isSyncing ? "Sincronizando..." : "Sincronizar via IA"}
               </button>
             )}

             {userRole === "CONEXT_ADMIN" && (
               <button 
                 onClick={handleDelete}
                 className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                 title="Excluir Projeto"
               >
                 <Trash2 className="w-5 h-5" />
               </button>
             )}
          </div>
        </div>

        {/* Tabs Manager */}
        <div className="px-6 border-b border-slate-100 flex gap-6">
          <TabButton 
            active={activeTab === "briefing"} 
            onClick={() => setActiveTab("briefing")}
            icon={<FileText className="w-4 h-4" />}
            label="Briefing & Arquivos"
            color={agencyColor}
          />
          <TabButton 
            active={activeTab === "milestones"} 
            onClick={() => setActiveTab("milestones")}
            icon={<Flag className="w-4 h-4" />}
            label="Marcos"
            color={agencyColor}
          />
          <TabButton 
            active={activeTab === "chat"} 
            onClick={() => setActiveTab("chat")}
            icon={<MessageSquare className="w-4 h-4" />}
            label="Conversa"
            color={agencyColor}
          />
          <TabButton 
            active={activeTab === "finance"} 
            onClick={() => setActiveTab("finance")}
            icon={<CreditCard className="w-4 h-4" />}
            label="Financeiro"
            color={agencyColor}
          />
          <TabButton 
            active={activeTab === "timeline"} 
            onClick={() => setActiveTab("timeline")}
            icon={<HistoryIcon className="w-4 h-4" />}
            label="Evolução"
            color={agencyColor}
          />
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {activeTab === "briefing" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">
                       <Building className="w-3 h-3" /> Agência
                    </div>
                    <div className="font-bold text-slate-800">{project.agency.name}</div>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">
                       <UserIcon className="w-3 h-3" /> Cliente
                    </div>
                    <div className="font-bold text-slate-800">{project.client.name}</div>
                 </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                       <Monitor className="w-3 h-3" /> Tecnologia / Plataforma Sugerida
                    </div>
                    {userRole === 'CONEXT_ADMIN' && !isEditingTech && (
                      <button onClick={() => setIsEditingTech(true)} className="text-blue-500 hover:text-blue-600 text-[10px] font-black uppercase">Editar</button>
                    )}
                  </div>
                  {isEditingTech ? (
                    <div className="flex gap-2">
                      <input 
                        className="flex-1 bg-white border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500"
                        value={tempTech}
                        onChange={e => setTempTech(e.target.value)}
                        placeholder="Ex: WordPress, Bubble..."
                      />
                      <button onClick={handleUpdateTech} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Salvar</button>
                      <button onClick={() => setIsEditingTech(false)} className="px-3 py-2 text-slate-400 text-[10px] font-bold uppercase">X</button>
                    </div>
                  ) : (
                    <div className="font-black text-slate-800 text-sm uppercase">
                      {project.suggestedTech || "Não informada"}
                    </div>
                  )}
              </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Layout className="w-4 h-4 text-slate-400" />
                       <h3 className="font-black text-slate-800 text-sm">Escopo da Agência (Contexto)</h3>
                    </div>
                    {isAgencyStaff && !isEditingDescription && (
                      <button 
                        onClick={() => setIsEditingDescription(true)} 
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                        title="Editar Contexto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isEditingDescription ? (
                    <div className="space-y-3">
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full bg-white border-2 border-blue-100 rounded-[24px] p-6 text-sm font-medium text-slate-700 min-h-[120px] focus:border-blue-300 focus:ring-0 transition-all outline-none"
                        placeholder="Descreva o contexto do projeto..."
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setIsEditingDescription(false);
                            setEditDescription(project.description || "");
                          }}
                          className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          disabled={isSubmitting}
                          onClick={async () => {
                            setIsSubmitting(true);
                            const res = await updateProjectAIContent(project.id, { description: editDescription }, currentUserId, userName);
                            setIsSubmitting(false);
                            if (res.success) {
                              setIsEditingDescription(false);
                              onUpdate();
                            } else {
                              alert("Erro ao salvar: " + res.error);
                            }
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                          {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Salvar Alteração
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 italic text-sm">
                      "{displayDescription || "Nenhuma descrição curta fornecida."}"
                    </p>
                  )}
                </div>

               {/* Briefing Estratégico */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Target className="w-3 h-3" /> Objetivo Central
                     </h4>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        {displayObjective || "Não informado"}
                      </p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-amber-500" /> Funcionalidades Core
                     </h4>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {displayFunctionalities || "Não informado"}
                      </p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <LinkIcon className="w-3 h-3 text-blue-500" /> Integrações
                     </h4>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {displayIntegrations || "Nenhuma informada"}
                      </p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100 md:col-span-2">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Globe className="w-3 h-3 text-emerald-500" /> Links de Referência
                     </h4>
                      <div className="flex flex-wrap gap-2">
                        {displayReferences?.map((ref: string, i: number) => (
                           ref ? (
                             <a 
                               key={i} 
                               href={ref.startsWith('http') ? ref : `https://${ref}`} 
                               target="_blank" 
                               className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-black text-blue-600 hover:border-blue-300 transition-all shadow-sm flex items-center gap-1.5"
                             >
                               <ExternalLink className="w-2.5 h-2.5" /> Ver Link
                             </a>
                           ) : null
                        ))}
                        {(!displayReferences || displayReferences.filter((r:string)=>r).length === 0) && (
                           <span className="text-[10px] text-slate-400 font-bold italic">Nenhum link fornecido</span>
                        )}
                      </div>
                     {Array.isArray(briefing?.agencyMaterialLinks) && briefing.agencyMaterialLinks.filter(Boolean).length > 0 && (
                       <div className="mt-4 pt-4 border-t border-slate-200">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Materiais extras (agência)</p>
                         <div className="flex flex-wrap gap-2">
                           {briefing.agencyMaterialLinks.map((ref: string, i: number) =>
                             ref ? (
                               <a
                                 key={`ag-${i}`}
                                 href={ref.startsWith("http") ? ref : `https://${ref}`}
                                 target="_blank"
                                 rel="noreferrer"
                                 className="px-3 py-1.5 bg-white border border-emerald-200 rounded-full text-[10px] font-black text-emerald-700 hover:border-emerald-300 transition-all shadow-sm flex items-center gap-1.5"
                               >
                                 <ExternalLink className="w-2.5 h-2.5" /> Material
                               </a>
                             ) : null
                           )}
                         </div>
                       </div>
                     )}
                  </div>
               </div>

              {/* Seções de IA Geradas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <h3 className="font-black text-slate-800 text-sm">Escopo Técnico (IA)</h3>
                  </div>
                  {(userRole === 'CONEXT_ADMIN' || isAgencyStaff) && !isEditingScope && (
                    <button onClick={() => setIsEditingScope(true)} className="text-slate-400 hover:text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {isEditingScope ? (
                  <div className="space-y-2">
                    <textarea 
                      className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-xs font-medium h-64 focus:bg-white transition-all shadow-inner"
                      value={editScope}
                      onChange={e => setEditScope(e.target.value)}
                    />
                    <button 
                      onClick={() => handleSaveAIContent('scope')}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest ml-auto"
                    >
                      <Save className="w-3 h-3" /> Salvar Escopo
                    </button>
                  </div>
                ) : (
                  <div className="bg-blue-50/30 rounded-2xl p-6 border border-blue-100 text-sm text-slate-700 prose prose-slate prose-xs max-w-none">
                     <pre className="whitespace-pre-wrap font-sans text-xs">{project.technicalScope || "Aguardando geração..."}</pre>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <h3 className="font-black text-slate-800 text-sm">Contrato Gerado</h3>
                  </div>
                  {userRole === 'CONEXT_ADMIN' && !isEditingContract && (
                    <button onClick={() => setIsEditingContract(true)} className="text-slate-400 hover:text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {isEditingContract ? (
                  <div className="space-y-2">
                    <textarea 
                      className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-xs font-medium h-64 focus:bg-white transition-all shadow-inner"
                      value={editContract}
                      onChange={e => setEditContract(e.target.value)}
                    />
                    <button 
                      onClick={() => handleSaveAIContent('contract')}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest ml-auto"
                    >
                      <Save className="w-3 h-3" /> Salvar Contrato
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-slate-300 text-[11px] leading-relaxed">
                     <pre className="whitespace-pre-wrap font-sans">{project.contractText || "Aguardando geração..."}</pre>
                  </div>
                )}

                {isAgencyStaff && Boolean(project.contractText) && !hasAcceptedContract && (
                  <button
                    onClick={handleAccept}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                    title="Aceitar contrato do projeto e liberar desenvolvimento"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Aceitar Contrato e Liberar Desenvolvimento
                  </button>
                )}
              </div>

              {/* Listagem de Milestones (Resumo) */}
              {milestones.length > 0 && (
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <h3 className="font-black text-slate-800 text-sm">Cronograma de Entrega</h3>
                      <button 
                         onClick={() => setActiveTab("milestones")}
                         className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                      >
                         Ver Detalhes
                      </button>
                   </div>
                   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                      {milestones.map((m: any) => (
                         <div key={m.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${m.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
                                  {m.done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                               </div>
                               <span className={`text-xs font-bold ${m.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{m.label}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               {m.date ? format(new Date(m.date), "dd/MM") : "TBD"}
                            </span>
                         </div>
                      ))}
                   </div>
                </div>
              )}

              {/* Snapshots UI */}
              <div className="space-y-4">
                <button 
                  onClick={() => setShowSnapshots(!showSnapshots)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <HistoryIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Histórico de Versões ({project.snapshots?.length || 0})</span>
                  </div>
                  {showSnapshots ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                </button>

                {showSnapshots && (
                  <div className="space-y-3 pl-4 border-l-2 border-slate-100 animate-in slide-in-from-top duration-300">
                    {project.snapshots?.map((snap: any, idx: number) => (
                      <div key={snap.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Versão #{project.snapshots.length - idx}</p>
                          <p className="text-xs font-bold text-slate-600">{format(new Date(snap.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                        </div>
                        <div className="flex gap-2">
                           {userRole === 'CONEXT_ADMIN' && (
                             <button 
                               onClick={() => handleRestoreSnapshot(snap.id)}
                               className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                               title="Restaurar esta versão"
                             >
                                <RotateCcw className="w-4 h-4" />
                             </button>
                           )}
                        </div>
                      </div>
                    ))}
                    {(!project.snapshots || project.snapshots.length === 0) && (
                      <p className="text-[10px] text-slate-400 font-bold uppercase p-4">Nenhuma versão anterior salva.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800 text-sm">Arquivos do Briefing</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{project.files?.length || 0} Itens</span>
                </div>
                
                <div className="space-y-2">
                  {project.files?.map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all group">
                      <div className="flex items-center gap-3">
                        {String(file.fileType || "").startsWith("image/") ? (
                          <img
                            src={getFileUrl(file.minioKey)}
                            alt={file.filename}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-700">{file.filename}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{(file.sizeBytes / 1024 / 1024).toFixed(2)} MB • {format(new Date(file.uploadedAt), "dd MMM HH:mm", { locale: ptBR })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <a 
                          href={getFileUrl(file.minioKey)} 
                          target="_blank"
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteProjectFile(file.id, file.filename)}
                          disabled={isSubmitting}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!project.files || project.files.length === 0) && (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                       <FileText className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                       <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum arquivo enviado</p>
                    </div>
                  )}
                </div>

                {(userRole === "CONEXT_ADMIN" || isAgencyStaff) && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-slate-800 text-sm">Materiais extras (links)</h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Drive, Figma, PDFs online…</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Adicione URLs de referência ou entrega. Clique em salvar para registrar no briefing do projeto.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={materialLinkInput}
                        onChange={(e) => setMaterialLinkInput(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
                      />
                      <button
                        type="button"
                        onClick={addMaterialLink}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50"
                      >
                        Adicionar
                      </button>
                    </div>
                    {materialLinks.length > 0 && (
                      <ul className="space-y-2">
                        {materialLinks.map((link, idx) => (
                          <li
                            key={`${link}-${idx}`}
                            className="flex items-center justify-between gap-2 p-3 bg-white border border-slate-200 rounded-xl"
                          >
                            <a
                              href={link.startsWith("http") ? link : `https://${link}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-blue-600 truncate"
                            >
                              {link}
                            </a>
                            <button
                              type="button"
                              onClick={() => removeMaterialLink(idx)}
                              className="shrink-0 p-2 text-slate-400 hover:text-rose-600"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveMaterialLinks}
                      disabled={savingMaterialLinks}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black disabled:opacity-50"
                    >
                      {savingMaterialLinks ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar links no projeto
                    </button>
                  </div>
                )}

                {(userRole === "CONEXT_ADMIN" || isAgencyStaff) && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-slate-800 text-sm">Enviar arquivos ao projeto</h3>
                    </div>
                    <ProjectDropzone
                      projectId={project.id}
                      projectPath={`projects/${project.agencyId}/${project.id}/${Date.now()}`}
                      themeColor={agencyColor}
                      agencyName={project.agency?.name || "Agência"}
                      onUploadComplete={() => onUpdate()}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "milestones" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="flex items-center justify-between">
                  <div>
                     <h3 className="font-black text-slate-800 text-lg tracking-tight">Marcos de Entrega</h3>
                     <p className="text-xs text-slate-500 font-medium">Defina as etapas e prazos de conclusão do projeto.</p>
                  </div>
                  {userRole === 'CONEXT_ADMIN' && (
                     <button 
                        onClick={addMilestone}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                     >
                        <Plus className="w-3 h-3" /> Adicionar Marco
                     </button>
                  )}
               </div>

               <div className="space-y-3">
                  {milestones.map((m: any) => (
                     <div key={m.id} className="group relative flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
                        
                        <button 
                           onClick={() => updateMilestone(m.id, 'done', !m.done)}
                           className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${m.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300 bg-white"}`}
                        >
                           {m.done && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </button>

                        <div className="flex-1 grid grid-cols-2 gap-4">
                           <input 
                              type="text"
                              value={m.label}
                              onChange={(e) => updateMilestone(m.id, 'label', e.target.value)}
                              placeholder="Nome do marco (ex: MVP 1.0)"
                              disabled={userRole !== 'CONEXT_ADMIN'}
                              className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 placeholder:text-slate-300 p-0"
                           />
                           <input 
                              type="date"
                              value={m.date}
                              onChange={(e) => updateMilestone(m.id, 'date', e.target.value)}
                              disabled={userRole !== 'CONEXT_ADMIN'}
                              className="bg-transparent border-none text-[10px] font-black text-slate-400 uppercase tracking-widest focus:ring-0 p-0 text-right"
                           />
                        </div>

                        {userRole === 'CONEXT_ADMIN' && (
                           <button 
                              onClick={() => removeMilestone(m.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-300 hover:text-rose-500 transition-all"
                           >
                              <X className="w-3 h-3" />
                           </button>
                        )}
                     </div>
                  ))}

                  {milestones.length === 0 && (
                     <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <Flag className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum marco definido</p>
                     </div>
                  )}
               </div>

               {userRole === 'CONEXT_ADMIN' && milestones.length > 0 && (
                  <button 
                     onClick={handleSaveMilestones}
                     disabled={savingMilestones}
                     className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                     {savingMilestones ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     Salvar Cronograma
                  </button>
               )}
            </div>
          )}

          {activeTab === "finance" && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
                   <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Preço Acordado</h3>
                      <CreditCard className="w-5 h-5 text-slate-500" />
                   </div>
                   <div className="flex items-end gap-4 mb-6">
                      <div className="flex-1">
                         <span className="text-3xl font-black">
                            {userRole === 'CONEXT_ADMIN' ? (
                               <div className="flex items-center gap-2">
                                  R$ <input 
                                    type="number"
                                    value={agreedPrice}
                                    onChange={e => setAgreedPrice(parseFloat(e.target.value))}
                                    className="bg-transparent border-b border-slate-700 text-3xl font-black w-32 focus:border-white focus:outline-none"
                                  />
                               </div>
                            ) : (
                               project.agreedPrice?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || "A definir"
                            )}
                         </span>
                      </div>
                      {userRole === 'CONEXT_ADMIN' && agreedPrice !== project.agreedPrice && (
                         <button 
                            onClick={handleUpdatePrice}
                            className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100"
                         >
                            Salvar Preço
                         </button>
                      )}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                      <div>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Geral</p>
                         <p className="text-sm font-bold">{project.status === 'DELIVERED' ? "Quitado" : "Em Aberto"}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Parcelas</p>
                         <p className="text-sm font-bold">{project.payments?.length || 0} Itens</p>
                      </div>
                   </div>
                </div>

                {userRole === 'CONEXT_ADMIN' && (
                  <div className="space-y-4">
                     <button 
                        onClick={() => setShowInstallmentsForm(!showInstallmentsForm)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
                     >
                        <Settings className="w-4 h-4" /> Configurar Parcelas
                     </button>

                     {showInstallmentsForm && (
                        <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-200 space-y-4 animate-in slide-in-from-top duration-300">
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase block mb-1">QTD Parcelas</label>
                                 <input 
                                    type="number"
                                    value={installmentCount}
                                    onChange={e => setInstallmentCount(parseInt(e.target.value))}
                                    className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                                    min="1"
                                 />
                              </div>
                              <div>
                                 <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase block mb-1">Primeiro Vencimento</label>
                                 <input 
                                    type="date"
                                    value={firstDueDate}
                                    onChange={e => setFirstDueDate(e.target.value)}
                                    className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                                 />
                              </div>
                           </div>
                           <button 
                              onClick={handleGenerateInstallments}
                              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800"
                           >
                              Gerar Parcelas Sugeridas
                           </button>
                        </div>
                     )}
                  </div>
                )}

                <div className="space-y-4">
                   <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" /> Fluxo de Pagamentos
                   </h3>
                   <div className="space-y-2">
                      {project.payments?.map((payment: any, idx: number) => (
                         <div key={payment.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-slate-300 transition-all group">
                            <div className="flex items-center gap-4">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${payment.status === 'PAID' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                                  {idx + 1}
                               </div>
                               <div>
                                  <p className="text-sm font-black text-slate-800">{payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Vencimento: {format(new Date(payment.dueDate), "dd/MM/yyyy")}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                  payment.status === 'PAID' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                               }`}>
                                  {payment.status === 'PAID' ? "Pago" : "Pendente"}
                               </span>
                               {userRole === 'CONEXT_ADMIN' && payment.status !== 'PAID' && (
                                  <button 
                                     onClick={() => handleUpdatePayment(payment.id, "PAID")}
                                     className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                     title="Marcar como Pago"
                                  >
                                     <CheckCircle2 className="w-5 h-5" />
                                  </button>
                               )}
                            </div>
                         </div>
                      ))}
                      {(!project.payments || project.payments.length === 0) && (
                         <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhuma parcela gerada</p>
                         </div>
                      )}
                   </div>
                </div>
             </div>
           )}

          {activeTab === "timeline" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 py-4">
               <div className="relative pl-8 space-y-8">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />
                  
                  {project.histories?.map((event: any) => (
                    <div key={event.id} className="relative">
                       <div className="absolute -left-10 w-6 h-6 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center z-10 shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-slate-400" />
                       </div>
                       <div>
                          <h4 className="font-bold text-slate-800 text-sm">{event.action}</h4>
                          {event.details && <p className="text-xs text-slate-500 mt-1">{event.details}</p>}
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">
                             {format(new Date(event.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                       </div>
                    </div>
                  ))}

                  <div className="relative">
                    <div 
                      className="absolute -left-10 w-6 h-6 border-2 rounded-full flex items-center justify-center z-10 shadow-sm"
                      style={{ backgroundColor: agencyColor, borderColor: agencyColor }}
                    >
                        <Clock className="w-3 h-3 text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm">Aguardando próximas ações...</h4>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="flex-1 space-y-4 mb-6">
                 {project.comments?.map((msg: any) => (
                   <div 
                    key={msg.id} 
                    className={`flex flex-col ${msg.userId === currentUserId ? "items-end" : "items-start"}`}
                   >
                     <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                           {msg.user ? msg.user.name.split(" ")[0] : (msg.clientAuthorName || "Cliente")}
                        </span>
                        {msg.isVisibleToClient && (
                          <span className="flex items-center gap-1 text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded-sm uppercase font-black">
                            <Eye className="w-2 h-2" /> Público
                          </span>
                        )}
                     </div>
                     <div className={`
                       max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed
                       ${msg.userId === currentUserId ? "bg-slate-900 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"}
                     `}>
                        {msg.text}
                     </div>
                     <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-1">
                       {format(new Date(msg.createdAt), "HH:mm")}
                     </span>
                   </div>
                 ))}
                 <div ref={chatEndRef} />
               </div>
            </div>
          )}

        </div>

        {/* Chat Input Fixado se Tab Chat estiver ativa */}
        {activeTab === "chat" && (
          <div className="p-6 border-t border-slate-100 bg-white">
             <form onSubmit={handleSendComment} className="relative">
                <textarea 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva sua mensagem interna..."
                  className="w-full bg-slate-50 border-slate-200 rounded-2xl px-4 py-4 pr-16 text-sm resize-none h-24 focus:ring-0 focus:border-slate-300"
                />
                
                <div className="absolute right-4 bottom-4 flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsPublicComment(!isPublicComment)}
                    className={`p-2 rounded-lg transition-all ${isPublicComment ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                    title={isPublicComment ? "Visível para o cliente" : "Oculto para o cliente"}
                  >
                    {isPublicComment ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>

                  <button 
                    type="submit"
                    disabled={isSubmitting || !commentText.trim()}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
             </form>
             <p className="text-[10px] text-slate-400 text-center mt-3 font-medium">
               Comentários com <Eye className="inline w-3 h-3 mx-1" /> marcados aparecerão no portal do cliente final.
             </p>
          </div>
        )}

      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, color }: any) {
  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center gap-2 py-4 px-2 border-b-2 transition-all font-bold text-xs uppercase tracking-widest
        ${active ? "border-slate-800 text-slate-800" : "border-transparent text-slate-400 hover:text-slate-600"}
      `}
      style={active ? { borderColor: color, color: color } : {}}
    >
      {icon}
      {label}
    </button>
  );
}
