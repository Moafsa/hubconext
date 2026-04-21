"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Mail, 
  MessageSquare, 
  ChevronRight, 
  Loader2,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { getProjectInfo, getProjectWhatsAppStatus } from "@/app/actions/db-actions";

export default function ClientVerifyPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [step, setStep] = useState<"choice" | "verify">("choice");
  const [channel, setChannel] = useState<"email" | "whatsapp" | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [zapOk, setZapOk] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const data = await getProjectInfo(projectId);
      if (data) setProject(data);
      const zap = await getProjectWhatsAppStatus(projectId);
      if ((zap as any).success && (zap as any).available && (zap as any).loggedIn) setZapOk(true);
      setIsLoaded(true);
    }
    load();
  }, [projectId]);

  const handleRequestCode = async (selectedChannel: "email" | "whatsapp") => {
    setIsLoading(true);
    setError("");
    const httpRes = await fetch("/api/portal/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, channel: selectedChannel }),
    });
    const res = await httpRes.json();
    if (httpRes.ok && res.success) {
      setChannel(selectedChannel);
      setStep("verify");
    } else {
      setError(res.error || "Erro ao enviar código.");
    }
    setIsLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    
    setIsLoading(true);
    setError("");
    const httpRes = await fetch("/api/portal/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, code }),
    });
    const res = await httpRes.json();
    if (httpRes.ok && res.success) {
      router.push(`/p/${projectId}`);
    } else {
      setError(res.error || "Código inválido.");
    }
    setIsLoading(false);
  };

  if (!isLoaded) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  if (!project) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h1 className="text-xl font-bold text-slate-800">Projeto Inválido</h1>
        <p className="text-slate-500">Este link não parece ser válido ou expirou.</p>
      </div>
    </div>
  );

  const themeColor = project.agency?.primaryColor || "#3b82f6";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full">
        
        {/* Logo/Branding Header */}
        <div className="text-center mb-8 space-y-4">
          <div 
             className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center font-black text-xl italic text-white shadow-xl"
             style={{ backgroundColor: themeColor }}
           >
             {project.agency?.logoUrl ? (
               <img src={project.agency.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
             ) : project.agency?.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Portal do Projeto</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Área Segura • {project.agency?.name}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="p-10">
            
            {step === "choice" ? (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-lg font-black text-slate-800">Verificação Necessária</h2>
                  <p className="text-sm text-slate-500 font-medium">Escolha onde deseja receber o seu código de acesso:</p>
                </div>

                <div className="space-y-3">
                  {project.client?.email && (
                    <button 
                      onClick={() => handleRequestCode("email")}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-white hover:ring-2 hover:ring-blue-100 rounded-2xl transition-all border border-slate-100 group"
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <Mail className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Enviar por E-mail</p>
                          <p className="font-bold text-slate-700">{project.client.email.replace(/(.{3})(.*)(@.*)/, "$1...$3")}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </button>
                  )}

                  {project.client?.whatsapp && (
                    <button 
                      onClick={() => handleRequestCode("whatsapp")}
                      disabled={isLoading || !zapOk}
                      className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-white hover:ring-2 hover:ring-emerald-100 rounded-2xl transition-all border border-slate-100 group"
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <MessageSquare className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Enviar por WhatsApp</p>
                          <p className="font-bold text-slate-700">{project.client.whatsapp.replace(/(.{4})(.*)(.{4})/, "$1...$3")}</p>
                          {!zapOk && (
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">
                              WhatsApp da agência indisponível
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 px-2 text-[10px] text-slate-400 font-medium leading-relaxed">
                  <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                  Sua sessão será válida por 15 dias neste navegador.
                </div>
              </div>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <button 
                  type="button" 
                  onClick={() => setStep("choice")}
                  className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Voltar
                </button>

                <div className="space-y-2">
                  <h2 className="text-lg font-black text-slate-800">Insira o Código</h2>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Enviamos um código de 6 dígitos para o seu {channel === "email" ? "e-mail" : "WhatsApp"}.
                  </p>
                </div>

                <div className="space-y-4">
                  <input 
                    type="text"
                    maxLength={6}
                    placeholder="000 000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center text-3xl font-black bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 focus:border-blue-500 focus:bg-white transition-all tracking-[0.5em] placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-300"
                    autoFocus
                  />

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center gap-2">
                       <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isLoading || code.length < 6}
                    className="w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: themeColor }}
                  >
                    {isLoading ? <Loader2 className="w-6 h-6 mx-auto animate-spin" /> : "Verificar e Acessar"}
                  </button>
                </div>

                <p className="text-center text-[11px] text-slate-400 font-medium">
                  Não recebeu? <button type="button" onClick={() => handleRequestCode(channel!)} className="text-blue-600 font-bold hover:underline">Reenviar código</button>
                </p>
              </form>
            )}

          </div>
        </div>

        <p className="text-center mt-8 text-[10px] text-slate-400 font-black uppercase tracking-widest leading-loose">
          Protegido por <span className="text-slate-600 tracking-tight">Conext Hub v2.0</span>
        </p>

      </div>
    </div>
  );
}
