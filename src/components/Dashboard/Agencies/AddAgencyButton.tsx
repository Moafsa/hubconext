"use client";

import { useState } from "react";
import { Plus, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createAgency } from "@/app/actions/db-actions";

export default function AddAgencyButton() {
  const [isOpen, setIsOpen] = useState(false);
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

    const result = await createAgency(formData);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setFormData({
          name: "",
          cnpj: "",
          responsibleName: "",
          responsibleEmail: "",
          responsiblePhone: ""
        });
      }, 2000);
    } else {
      if (result.error === "CNPJ_ALREADY_EXISTS") setError("Este CNPJ já está cadastrado.");
      else if (result.error === "EMAIL_ALREADY_EXISTS") setError("Este e-mail já está em uso.");
      else setError(result.error || "Falha ao criar agência.");
    }
    setLoading(false);
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
      >
        <Plus className="w-5 h-5" />
        Cadastrar Agência
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !loading && setIsOpen(false)}
          />
          
          <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Nova Agência Parceira</h2>
                <p className="text-sm text-slate-500 font-medium text-slate-400">Cadastre uma nova agência no sistema.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              {success ? (
                <div className="py-12 text-center space-y-4 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">Agência Criada!</h3>
                  <p className="text-slate-500 font-medium">Os dados foram salvos e o acesso foi liberado.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Agência</label>
                      <input 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: Innova Digital"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium text-slate-700"
                      />
                    </div>
                    
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                      <input 
                        required
                        value={formData.cnpj}
                        onChange={e => setFormData({...formData, cnpj: e.target.value})}
                        placeholder="00.000.000/0000-00"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium text-slate-700"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Responsável</label>
                      <input 
                        required
                        value={formData.responsibleName}
                        onChange={e => setFormData({...formData, responsibleName: e.target.value})}
                        placeholder="Nome completo"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium text-slate-700"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                      <input 
                        value={formData.responsiblePhone}
                        onChange={e => setFormData({...formData, responsiblePhone: e.target.value})}
                        placeholder="(00) 00000-0000"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium text-slate-700"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                      <input 
                        required
                        type="email"
                        value={formData.responsibleEmail}
                        onChange={e => setFormData({...formData, responsibleEmail: e.target.value})}
                        placeholder="email@agencia.com"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium text-slate-700"
                      />
                      <p className="text-[10px] text-slate-400 font-bold ml-1">Este será o login do administrador da agência.</p>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold border border-rose-100 animate-shake">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Confirmar Cadastro"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
