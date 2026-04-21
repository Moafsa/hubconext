"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Building2,
  Mail,
  User,
  Phone,
  ArrowLeft
} from "lucide-react";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    responsibleName: "",
    responsibleEmail: "",
    responsiblePhone: ""
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agencies/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        if (data.error === "CNPJ_ALREADY_EXISTS") setError("Este CNPJ já possui uma conta ativa.");
        else if (data.error === "EMAIL_ALREADY_EXISTS") setError("Este e-mail já está sendo utilizado.");
        else setError(data.error || "Ocorreu um erro ao processar seu cadastro.");
      }
    } catch (err) {
      setError("Falha na conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 selection:bg-blue-100">
        <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-blue-500/10 p-12 text-center space-y-8 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Agência Cadastrada!</h1>
            <p className="text-slate-500 font-medium leading-relaxed">
              Sua conta foi criada com sucesso. Agora você já pode acessar o painel com seu e-mail.
            </p>
          </div>
          <Link 
            href="/login" 
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[24px] font-black text-lg transition-all shadow-xl shadow-blue-500/20"
          >
            Acessar Painel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100">
      
      {/* Header Minimalista */}
      <header className="p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
             <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5 text-white" />
             </div>
             <span className="text-lg font-black tracking-tighter text-slate-800">Conext<span className="text-blue-600">Hub</span></span>
          </Link>
          <Link href="/login" className="text-sm font-black text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2">
            Já tenho conta <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 pb-20">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Torne-se uma <span className="text-blue-600">Agência Parceira</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium max-w-md mx-auto">
              Escalabilidade, White-Label e Briefing Inteligente para sua operação.
            </p>
          </div>

          <div className="bg-white rounded-[48px] shadow-2xl shadow-blue-500/5 border border-slate-100 p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Dados da Empresa */}
                <div className="md:col-span-2">
                   <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Dados da Agência
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Agência</label>
                        <input 
                          required
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder="Ex: Innova Digital"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium text-slate-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                        <input 
                          required
                          value={formData.cnpj}
                          onChange={e => setFormData({...formData, cnpj: e.target.value})}
                          placeholder="00.000.000/0000-00"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium text-slate-700"
                        />
                      </div>
                   </div>
                </div>

                {/* Dados do Responsável */}
                <div className="md:col-span-2 pt-4">
                   <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <User className="w-4 h-4" /> Dados do Responsável
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                        <input 
                          required
                          value={formData.responsibleName}
                          onChange={e => setFormData({...formData, responsibleName: e.target.value})}
                          placeholder="Como quer ser chamado?"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium text-slate-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                        <input 
                          required
                          value={formData.responsiblePhone}
                          onChange={e => setFormData({...formData, responsiblePhone: e.target.value})}
                          placeholder="(00) 00000-0000"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium text-slate-700"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                        <input 
                          required
                          type="email"
                          value={formData.responsibleEmail}
                          onChange={e => setFormData({...formData, responsibleEmail: e.target.value})}
                          placeholder="seu@email.com"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium text-slate-700"
                        />
                        <p className="text-[10px] text-slate-400 font-bold ml-1 italic">
                          * Este e-mail será usado para login e recebimento de códigos de segurança.
                        </p>
                      </div>
                   </div>
                </div>

              </div>

              {error && (
                <div className="flex items-center gap-3 p-5 bg-rose-50 text-rose-600 rounded-[24px] text-sm font-bold border border-rose-100 animate-shake">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-[24px] font-black text-xl transition-all shadow-2xl shadow-blue-500/25 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Criar Minha Agência <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <p className="text-center text-slate-400 text-xs font-medium mt-6">
                  Ao clicar em criar conta, você concorda com nossos termos de uso e política de privacidade.
                </p>
              </div>
            </form>
          </div>
          
          <Link href="/" className="mt-8 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar para o site
          </Link>
        </div>
      </main>
    </div>
  );
}
