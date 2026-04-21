"use client";

import { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Sparkles, 
  Save, 
  Lock,
  Eye,
  EyeOff,
  Palette,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  QrCode,
  RefreshCw,
  CheckCircle,
  Link as LinkIcon
} from "lucide-react";
import { 
  getGlobalConfig, 
  updateGlobalConfig, 
  connectGlobalWhatsAppInstance, 
  getGlobalWhatsAppConnectionStatus,
  testSmtpConnection 
} from "@/app/actions/db-actions";
import { useRouter } from "next/navigation";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [config, setConfig] = useState({
    platformName: "Conext Hub",
    primaryColor: "#3b82f6",
    logoUrl: "",
    openaiApiKey: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
  });

  // WhatsApp
  const [isConnectingZap, setIsConnectingZap] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isZapConnected, setIsZapConnected] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getGlobalConfig();
      if (data) {
        setConfig({
          platformName: data.platformName,
          primaryColor: data.primaryColor || "#3b82f6",
          logoUrl: data.logoUrl || "",
          openaiApiKey: data.openaiApiKey || "",
          smtpHost: data.smtpHost || "",
          smtpPort: data.smtpPort || 587,
          smtpUser: data.smtpUser || "",
          smtpPass: data.smtpPass || "",
          smtpFrom: data.smtpFrom || "",
        });

        if (data.uzapiToken) {
          const zap = await getGlobalWhatsAppConnectionStatus();
          if (zap.success && zap.loggedIn) {
            setIsZapConnected(true);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!qrCode || isZapConnected) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      const zap = await getGlobalWhatsAppConnectionStatus();
      if (cancelled) return;
      if (zap.success && zap.loggedIn) {
        setIsZapConnected(true);
        setQrCode(null);
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [qrCode, isZapConnected]);

  const handleConnectZap = async () => {
    setIsConnectingZap(true);
    try {
      const result = await connectGlobalWhatsAppInstance();
      if (result.success && result.qr) {
        setQrCode(result.qr);
        setIsZapConnected(false);
      } else if (result.success && result.connected) {
        setIsZapConnected(true);
        setQrCode(null);
        alert("WhatsApp Master conectado com sucesso!");
      } else {
        alert("Erro ao conectar WhatsApp: " + result.error);
      }
    } catch (err: any) {
      alert("Erro crítico no WhatsApp: " + err.message);
    } finally {
      setIsConnectingZap(false);
    }
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    try {
      const result = await testSmtpConnection("master", {
        host: config.smtpHost,
        port: config.smtpPort,
        user: config.smtpUser,
        pass: config.smtpPass,
        from: config.smtpFrom
      });
      
      if (result.success) {
        alert("E-mail de teste enviado com sucesso!");
      } else {
        alert("Erro no SMTP: " + result.error);
      }
    } catch (err: any) {
      alert("Erro crítico ao testar SMTP: " + err.message);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateGlobalConfig(config);
    if (res.success) {
      alert("Configurações mestres atualizadas com sucesso!");
    } else {
      alert("Erro ao salvar: " + res.error);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Master Control Panel</span>
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Configurações do Sistema</h1>
        <p className="text-slate-500 font-medium">Controle as variáveis globais, branding e inteligência artificial da plataforma.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Card: Inteligência Artificial */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Sparkles className="w-6 h-6 text-white" />
               </div>
               <div>
                  <h3 className="font-black text-slate-800 tracking-tight text-lg">Cérebro da IA</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Orquestrador Conext AI</p>
               </div>
            </div>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
               <Lock className="w-5 h-5 text-amber-500 shrink-0" />
               <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  A chave da OpenAI é usada para gerar automaticamente os escopos técnicos e contratos. 
                  Ela é armazenada de forma segura e nunca é exposta para agências ou clientes.
               </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OpenAI API Key</label>
              <div className="relative">
                <input 
                  type={showKey ? "text" : "password"}
                  className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono focus:bg-white transition-all shadow-inner pr-14"
                  placeholder="sk-..."
                  value={config.openaiApiKey}
                  onChange={e => setConfig({...config, openaiApiKey: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-4 top-4 p-1 text-slate-300 hover:text-slate-600 transition-colors"
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Branding Global */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
                <Palette className="w-6 h-6 text-white" />
             </div>
             <div>
                <h3 className="font-black text-slate-800 tracking-tight text-lg">Branding & Identidade</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Aparência Global da Plataforma</p>
             </div>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Plataforma</label>
               <input 
                 className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                 value={config.platformName}
                 onChange={e => setConfig({...config, platformName: e.target.value})}
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor Primária (Hex)</label>
               <div className="flex gap-3">
                  <label className="cursor-pointer group relative">
                    <input 
                      type="color"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      value={config.primaryColor}
                      onChange={e => setConfig({...config, primaryColor: e.target.value.toUpperCase()})}
                    />
                    <div 
                      className="w-14 h-14 rounded-2xl border-2 border-white shadow-md shrink-0 transition-transform group-hover:scale-105 active:scale-95"
                      style={{ backgroundColor: config.primaryColor }}
                      title="Clique para escolher a cor"
                    />
                  </label>
                  <input 
                    className="flex-1 bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                    value={config.primaryColor}
                    onChange={e => setConfig({...config, primaryColor: e.target.value.toUpperCase()})}
                    placeholder="#000000"
                  />
               </div>
            </div>

            <div className="md:col-span-2 space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL do Logo Master</label>
               <div className="relative">
                  <ImageIcon className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                  <input 
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium focus:bg-white transition-all shadow-inner"
                    placeholder="https://sua-cdn.com/logo.png"
                    value={config.logoUrl}
                    onChange={e => setConfig({...config, logoUrl: e.target.value})}
                  />
               </div>
            </div>
          </div>
        </div>

        {/* Card: Comunicação Global (SMTP) */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                  <Mail className="w-6 h-6 text-white" />
               </div>
               <div>
                  <h3 className="font-black text-slate-800 tracking-tight text-lg">E-mail Master (SMTP)</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Disparador de Fallback & Admin</p>
               </div>
            </div>
            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={isTestingSmtp || !config.smtpHost}
              className="px-6 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl text-xs font-black transition-all disabled:opacity-50 flex items-center gap-2 border border-purple-200"
            >
              {isTestingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Testar SMTP Master
            </button>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Host SMTP</label>
              <input 
                className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                placeholder="smtp.mailtrap.io"
                value={config.smtpHost}
                onChange={e => setConfig({...config, smtpHost: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Porta</label>
              <input 
                type="number"
                className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                placeholder="587"
                value={config.smtpPort}
                onChange={e => setConfig({...config, smtpPort: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</label>
              <input 
                className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                value={config.smtpUser}
                onChange={e => setConfig({...config, smtpUser: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha</label>
              <input 
                type="password"
                className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                value={config.smtpPass}
                onChange={e => setConfig({...config, smtpPass: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail Remetente</label>
              <input 
                className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white transition-all shadow-inner"
                placeholder="no-reply@conext.click"
                value={config.smtpFrom}
                onChange={e => setConfig({...config, smtpFrom: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Card: WhatsApp Master (Wuzapi) */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
             <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <MessageSquare className="w-6 h-6 text-white" />
             </div>
             <div>
                <h3 className="font-black text-slate-800 tracking-tight text-lg">WhatsApp Master</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Fallback Global via Wuzapi</p>
             </div>
          </div>
          
          <div className="p-8">
            {isZapConnected ? (
              <div className="flex flex-col items-center gap-4 p-10 bg-emerald-50 rounded-[32px] border border-emerald-100 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-emerald-800">WhatsApp Master Conectado</p>
                  <p className="text-xs text-emerald-700/80 font-medium">Este número será usado como fallback para todas as agências.</p>
                </div>
                <button
                  type="button"
                  onClick={handleConnectZap}
                  disabled={isConnectingZap}
                  className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {isConnectingZap ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Recriar Instância Master
                </button>
              </div>
            ) : !qrCode ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed border-slate-100 rounded-[32px]">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center animate-pulse">
                  <QrCode className="w-8 h-8 text-slate-300" />
                </div>
                <div className="max-w-xs space-y-1">
                  <p className="font-black text-slate-800">Conectar WhatsApp Master</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">Gerencie o número que enviará as notificações globais.</p>
                </div>
                <button 
                  type="button"
                  onClick={handleConnectZap}
                  disabled={isConnectingZap}
                  className="mt-6 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {isConnectingZap ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  {isConnectingZap ? "Sincronizando..." : "Gerar QR Code Master"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                <div className="p-4 bg-white rounded-2xl shadow-inner">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Escaneie com seu Celular</p>
                  <p className="text-[11px] text-slate-400 font-medium">Acesse o WhatsApp &gt; Aparelhos Conectados</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-4">
           <button 
             type="submit"
             disabled={saving}
             className="flex items-center gap-2 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
           >
             {saving ? (
               <Loader2 className="w-5 h-5 animate-spin" />
             ) : (
               <Save className="w-5 h-5" />
             )}
             Salvar Configurações Master
           </button>
        </div>

      </form>
    </div>
  );
}
