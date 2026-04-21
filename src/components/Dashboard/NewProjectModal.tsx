"use client";

import { useState } from "react";
import { 
  X, 
  Send, 
  FileText, 
  DollarSign, 
  Calendar,
  User as UserIcon,
  Loader2
} from "lucide-react";
import { createProject } from "@/app/actions/db-actions";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "WEBSITE" as const,
    clientName: "",
    clientEmail: "",
    proposedPrice: "",
    deadline: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const agencyId = (session?.user as any)?.agencyId;

    if (!agencyId) {
      alert("Erro: agência não identificada.");
      setIsLoading(false);
      return;
    }

    const result = await createProject({
      ...formData,
      proposedPrice: parseFloat(formData.proposedPrice),
      agencyId
    });

    if (result.success) {
      alert("Proposta enviada com sucesso! A Conext analisará o seu pedido.");
      router.refresh();
      onClose();
    } else {
      alert("Erro ao enviar proposta: " + result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Novo Pedido de Escopo</h2>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Inicie um projeto com a Conext</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Título do Projeto</label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Ex: Landing Page Clínica Sorriso"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Descrição / Escopo Resumido</label>
              <textarea 
                required
                rows={3}
                className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="O que o cliente precisa exatamente?"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 space-y-4 md:col-span-2">
               <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                 <UserIcon className="w-4 h-4" /> Dados do Cliente Final
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Nome do Cliente"
                    className="w-full bg-white border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={formData.clientName}
                    onChange={e => setFormData({...formData, clientName: e.target.value})}
                  />
                  <input 
                    type="email" 
                    placeholder="Email do Cliente"
                    className="w-full bg-white border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={formData.clientEmail}
                    onChange={e => setFormData({...formData, clientEmail: e.target.value})}
                  />
               </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Sua Proposta de Valor (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="0,00"
                  value={formData.proposedPrice}
                  onChange={e => setFormData({...formData, proposedPrice: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Prazo Sugerido</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                  value={formData.deadline}
                  onChange={e => setFormData({...formData, deadline: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black transition-all shadow-lg shadow-blue-500/20"
            >
              <Send className="w-5 h-5" />
              Enviar Proposta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
