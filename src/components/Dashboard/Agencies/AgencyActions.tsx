"use client";

import { useState } from "react";
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  X, 
  Loader2, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { updateAgency, deleteAgency } from "@/app/actions/db-actions";

interface AgencyActionsProps {
  agency: any;
}

export default function AgencyActions({ agency }: AgencyActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: agency.name || "",
    cnpj: agency.cnpj || "",
    responsibleName: agency.responsibleName || "",
    responsibleEmail: agency.responsibleEmail || "",
    responsiblePhone: agency.responsiblePhone || ""
  });

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await updateAgency(agency.id, formData);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setIsEditOpen(false);
        setSuccess(false);
      }, 2000);
    } else {
      setError(result.error || "Falha ao atualizar agência.");
    }
    setLoading(false);
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const result = await deleteAgency(agency.id);

    if (result.success) {
      setIsDeleteOpen(false);
    } else {
      setError(result.error || "Falha ao excluir agência.");
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 text-slate-400 hover:text-slate-600 transition-all rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowMenu(false)} 
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <button 
              onClick={() => { setIsEditOpen(true); setShowMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
            >
              <Pencil className="w-4 h-4 text-blue-500" /> Editar Dados
            </button>
            <div className="h-px bg-slate-100 my-1 mx-2" />
            <button 
              onClick={() => { setIsDeleteOpen(true); setShowMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Excluir Agência
            </button>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && setIsEditOpen(false)} />
          <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Editar Agência</h2>
              <button onClick={() => setIsEditOpen(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 border border-transparent hover:border-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8">
              {success ? (
                <div className="py-12 text-center space-y-4 animate-in zoom-in">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600"><CheckCircle2 className="w-10 h-10" /></div>
                  <h3 className="text-2xl font-black text-slate-800">Atualizado!</h3>
                </div>
              ) : (
                <form onSubmit={handleUpdate} className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nome</label>
                      <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">CNPJ</label>
                      <input required value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none font-medium" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Responsável</label>
                        <input required value={formData.responsibleName} onChange={e => setFormData({...formData, responsibleName: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none font-medium" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">WhatsApp</label>
                        <input value={formData.responsiblePhone} onChange={e => setFormData({...formData, responsiblePhone: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none font-medium" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">E-mail</label>
                      <input required type="email" value={formData.responsibleEmail} onChange={e => setFormData({...formData, responsibleEmail: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none font-medium" />
                    </div>
                  </div>
                  {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold border border-rose-100">{error}</div>}
                  <button disabled={loading} type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Alterações"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && setIsDeleteOpen(false)} />
          <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600"><AlertCircle className="w-10 h-10" /></div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Excluir Agência?</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Esta ação é irreversível. Todos os usuários e clientes vinculados a esta agência serão removidos.
                </p>
              </div>
              {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold border border-rose-100">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setIsDeleteOpen(false)} disabled={loading} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all">Cancelar</button>
                <button onClick={handleDelete} disabled={loading} className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sim, Excluir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
