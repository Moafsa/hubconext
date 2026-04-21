"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Palette, 
  Image as ImageIcon, 
  Save, 
  Loader2,
  CheckCircle,
  Link as LinkIcon,
  ShieldCheck,
  Mail,
  MessageSquare,
  QrCode,
  RefreshCw,
  FileText
} from "lucide-react";
import { 
  updateAgencySettings, 
  getAgencySettings, 
  getGlobalConfig, 
  updateGlobalConfig,
  connectWhatsAppInstance,
  getWhatsAppConnectionStatus,
  testSmtpConnection
} from "@/app/actions/db-actions";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Branding
  const [color, setColor] = useState("#3b82f6");
  const [logoUrl, setLogoUrl] = useState("");

  // Dados da Agência (jurídico/contato)
  const [agencyName, setAgencyName] = useState("");
  const [agencyLegalName, setAgencyLegalName] = useState("");
  const [agencyCnpj, setAgencyCnpj] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleEmail, setResponsibleEmail] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");

  // SMTP
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");

  // WhatsApp
  const [isConnectingZap, setIsConnectingZap] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isZapConnected, setIsZapConnected] = useState(false);

  const user = session?.user as any;
  const isAdmin = user?.role === "CONEXT_ADMIN";
  const agencyId = user?.agencyId;

  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  const handleTestSmtp = async () => {
    if (!agencyId) return;
    setIsTestingSmtp(true);
    try {
      const result = await testSmtpConnection(agencyId, {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        pass: smtpPass,
        from: smtpFrom
      });
      
      if (result.success) {
        const recipient = (smtpFrom && smtpFrom.includes("@")) ? smtpFrom : smtpUser;
        let msg = "E-mail de teste enviado com acesso para " + recipient;
        
        if ((result as any).autoAdjustedHost) {
          const newHost = (result as any).autoAdjustedHost;
          setSmtpHost(newHost);
          msg += `\n\n✨ AUTO-AJUSTE: O endereço que você digitou não respondeu, mas encontramos o servidor correto (${newHost}) e o teste funcionou! \n\nClique em 'Salvar Tudo' para manter este ajuste.`;
        }
        
        alert(msg);
      } else {
        alert("Erro no SMTP: " + result.error);
      }
    } catch (err: any) {
      alert("Erro crítico ao testar SMTP: " + err.message);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      if (isAdmin) {
        const config = await getGlobalConfig();
        if (config) {
          if (config.primaryColor) setColor(config.primaryColor);
          if (config.logoUrl) setLogoUrl(config.logoUrl);
        }
      } else if (agencyId) {
        const settings = await getAgencySettings(agencyId);
        if (settings) {
          if (settings.name) setAgencyName(settings.name);
          if ((settings as any).legalName) setAgencyLegalName((settings as any).legalName);
          if ((settings as any).cnpj) setAgencyCnpj((settings as any).cnpj);
          if ((settings as any).phone) setAgencyPhone((settings as any).phone);
          if ((settings as any).responsibleName) setResponsibleName((settings as any).responsibleName);
          if ((settings as any).responsibleEmail) setResponsibleEmail((settings as any).responsibleEmail);
          if ((settings as any).responsiblePhone) setResponsiblePhone((settings as any).responsiblePhone);
          if ((settings as any).addressLine) setAddressLine((settings as any).addressLine);
          if ((settings as any).addressDistrict) setAddressDistrict((settings as any).addressDistrict);
          if ((settings as any).addressCity) setAddressCity((settings as any).addressCity);
          if ((settings as any).addressState) setAddressState((settings as any).addressState);
          if ((settings as any).addressZip) setAddressZip((settings as any).addressZip);
          if (settings.primaryColor) setColor(settings.primaryColor);
          if (settings.logoUrl) setLogoUrl(settings.logoUrl);
          if (settings.smtpHost) setSmtpHost(settings.smtpHost);
          if (settings.smtpPort) setSmtpPort(settings.smtpPort);
          if (settings.smtpUser) setSmtpUser(settings.smtpUser);
          if (settings.smtpPass) setSmtpPass(settings.smtpPass);
          if (settings.smtpFrom) setSmtpFrom(settings.smtpFrom);

          // Se já tiver token, checa status para persistir UI após refresh
          if ((settings as any).uzapiToken) {
            const zap = await getWhatsAppConnectionStatus(agencyId);
            if ((zap as any).success && (zap as any).loggedIn) {
              setIsZapConnected(true);
              setQrCode(null);
            } else {
              setIsZapConnected(false);
            }
          } else {
            setIsZapConnected(false);
          }
        }
      }
    }
    loadSettings();
  }, [isAdmin, agencyId]);

  // Se estiver mostrando QR, faz polling até ficar LoggedIn e trocar UI automaticamente
  useEffect(() => {
    if (isAdmin || !agencyId) return;
    if (!qrCode || isZapConnected) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      const zap = await getWhatsAppConnectionStatus(agencyId);
      if (cancelled) return;
      if ((zap as any).success && (zap as any).loggedIn) {
        setIsZapConnected(true);
        setQrCode(null);
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [qrCode, isZapConnected, agencyId, isAdmin]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let result;
    if (isAdmin) {
      result = await updateGlobalConfig({ primaryColor: color, logoUrl });
    } else if (agencyId) {
      result = await updateAgencySettings(agencyId, { 
        name: agencyName,
        legalName: agencyLegalName,
        cnpj: agencyCnpj,
        phone: agencyPhone,
        responsibleName,
        responsibleEmail,
        responsiblePhone,
        addressLine,
        addressDistrict,
        addressCity,
        addressState,
        addressZip,
        primaryColor: color, 
        logoUrl,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpFrom
      });
    } else {
      alert("Erro: Nenhum contexto de configuração encontrado.");
      setIsLoading(false);
      return;
    }
    
    if (result.success) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert("Erro ao salvar: " + (result as any).error);
    }
    setIsLoading(false);
  };

  const handleConnectZap = async () => {
    if (!agencyId) return;
    setIsConnectingZap(true);
    try {
      const result = await connectWhatsAppInstance(agencyId);
      if (result.success && result.qr) {
        setQrCode(result.qr);
        setIsZapConnected(false);
        alert("QR Code gerado com sucesso! Escaneie para conectar.");
      } else if ((result as any).success && (result as any).connected) {
        setIsZapConnected(true);
        setQrCode(null);
        alert("WhatsApp conectado com sucesso!");
      } else {
        // Se não retornou QR, pode já estar logado; checa status
        const zap = await getWhatsAppConnectionStatus(agencyId);
        if ((zap as any).success && (zap as any).loggedIn) {
          setIsZapConnected(true);
          setQrCode(null);
          alert("WhatsApp conectado com sucesso!");
        } else {
          const errorMsg = (result as any).error || "Falha ao carregar QR Code.";
          alert("Erro ao conectar WhatsApp: " + errorMsg);
        }
      }
    } catch (err: any) {
      alert("Erro crítico no WhatsApp: " + err.message);
    } finally {
      setIsConnectingZap(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-12 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isAdmin ? (
              <div className="px-2 py-0.5 bg-amber-100 rounded-md flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none">Configuração Master</span>
              </div>
            ) : (
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Identidade da sua Agência</span>
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            {isAdmin ? "Branding Hub" : "Configurações da Agência"}
          </h1>
          <p className="text-slate-500 font-medium">
            Gerencie sua marca branca, canais de comunicação e segurança.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {saved && (
            <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in fade-in slide-in-from-right-4">
              <CheckCircle className="w-5 h-5 transition-all" />
              <span>Configurações salvas!</span>
            </div>
          )}
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-8 py-3.5 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <Save className="w-5 h-5" /> Salvar Tudo
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        
        {/* Branding Section */}
        <div className="space-y-6">
          {/* Agency Legal/Contact Section */}
          {!isAdmin && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 leading-none">Dados da Agência (Contrato)</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Jurídico & Contato</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-black text-slate-700">Nome Fantasia</label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="Nome da Agência"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-black text-slate-700">Razão Social (opcional)</label>
                  <input
                    type="text"
                    value={agencyLegalName}
                    onChange={(e) => setAgencyLegalName(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="Razão social"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">CNPJ</label>
                  <input
                    type="text"
                    value={agencyCnpj}
                    onChange={(e) => setAgencyCnpj(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">Telefone</label>
                  <input
                    type="text"
                    value={agencyPhone}
                    onChange={(e) => setAgencyPhone(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">Responsável (nome)</label>
                  <input
                    type="text"
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="Nome do responsável"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">Responsável (e-mail)</label>
                  <input
                    type="email"
                    value={responsibleEmail}
                    onChange={(e) => setResponsibleEmail(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="responsavel@agencia.com"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-black text-slate-700">Responsável (telefone)</label>
                  <input
                    type="text"
                    value={responsiblePhone}
                    onChange={(e) => setResponsiblePhone(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-black text-slate-700">Endereço (rua/número/complemento)</label>
                  <input
                    type="text"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="Rua X, 123, Sala 4"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">Bairro</label>
                  <input
                    type="text"
                    value={addressDistrict}
                    onChange={(e) => setAddressDistrict(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="Centro"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">CEP</label>
                  <input
                    type="text"
                    value={addressZip}
                    onChange={(e) => setAddressZip(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">Cidade</label>
                  <input
                    type="text"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="Flores da Cunha"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">UF</label>
                  <input
                    type="text"
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="RS"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Palette className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 leading-none">Branding & Cores</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Identidade Visual</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">Cor Primária</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-12 rounded-xl border-0 p-0 cursor-pointer shadow-sm"
                  />
                  <input 
                    type="text" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">Logo (URL)</label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="url" 
                    placeholder="https://sua-marca.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Preview Card */}
            <div className="bg-slate-50 rounded-3xl p-6 flex items-center gap-6 border border-slate-100">
               <div 
                 className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-2xl italic text-white shadow-xl"
                 style={{ backgroundColor: color }}
               >
                 {logoUrl ? <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain" /> : "LOGO"}
               </div>
               <div className="flex-1 space-y-2">
                 <div className="h-2 w-32 bg-slate-200 rounded-full" />
                 <div className="h-2 w-20 bg-slate-200 rounded-full" />
                 <div 
                   className="mt-2 px-4 py-2 w-max rounded-xl text-[10px] font-black uppercase tracking-wider text-white"
                   style={{ backgroundColor: color }}
                 >
                   Botão de Exemplo
                 </div>
               </div>
            </div>
          </div>

          {/* Email Settings */}
          {!isAdmin && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-slate-800 leading-none">Comunicação via E-mail</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Servidor SMTP Próprio</p>
                </div>
                <button
                  onClick={handleTestSmtp}
                  disabled={isTestingSmtp || !smtpHost}
                  className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl text-xs font-black transition-all disabled:opacity-50 flex items-center gap-2 border border-purple-200"
                >
                  {isTestingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {isTestingSmtp ? "Testando..." : "Testar SMTP"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-black text-slate-700">Host SMTP</label>
                  <input 
                    type="text" 
                    placeholder="smtp.exemplo.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">Porta</label>
                  <input 
                    type="number" 
                    placeholder="465 ou 587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">Usuário</label>
                  <input 
                    type="text" 
                    placeholder="seu@email.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-black text-slate-700">Senha</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-black text-slate-700">E-mail do Remetente (Ex: suporte@agencia.com)</label>
                  <input 
                    type="email" 
                    placeholder="suporte@agencia.com"
                    value={smtpFrom}
                    onChange={(e) => setSmtpFrom(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp & OTP Section */}
        {!isAdmin && (
          <div className="space-y-10">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 leading-none">WhatsApp Business (Wuzapi)</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Conexão via QR Code</p>
                </div>
              </div>

              {isZapConnected ? (
                <div className="flex flex-col items-center gap-4 p-10 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-emerald-800">WhatsApp Conectado</p>
                    <p className="text-xs text-emerald-700/80 font-medium">Sessão ativa. Seus clientes podem receber códigos por WhatsApp.</p>
                  </div>
                  <button
                    onClick={handleConnectZap}
                    disabled={isConnectingZap}
                    className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {isConnectingZap ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Revalidar Conexão
                  </button>
                </div>
              ) : !qrCode ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed border-slate-100 rounded-3xl">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center animate-pulse">
                    <QrCode className="w-8 h-8 text-slate-300" />
                  </div>
                  <div className="max-w-xs space-y-1">
                    <p className="font-black text-slate-800">Conectar Novo Número</p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Clique abaixo para gerar o QR Code e sincronizar o WhatsApp da sua agência.</p>
                  </div>
                  <button 
                    onClick={handleConnectZap}
                    disabled={isConnectingZap}
                    className="mt-6 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {isConnectingZap ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {isConnectingZap ? "Sincronizando..." : "Ativar WhatsApp"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 p-8 bg-slate-50 rounded-3xl border border-slate-100">
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

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black">Segurança do Portal (OTP)</h3>
                <p className="text-slate-400 font-medium text-sm leading-relaxed">
                  Com as conexões acima ativas, seus clientes agora precisam validar o acesso em 2 etapas. 
                  Sessões expiram automaticamente após <span className="text-white font-bold underline decoration-emerald-500 underline-offset-4">15 dias.</span>
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
