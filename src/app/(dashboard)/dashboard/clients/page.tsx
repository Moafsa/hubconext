"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Users, 
  Search, 
  Trash2, 
  Mail, 
  MessageSquare,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Loader2,
  Edit2,
  Save,
  X
} from "lucide-react";
import { getClients, deleteClient, updateClient } from "@/app/actions/db-actions";
import { useRouter } from "next/navigation";

export default function ClientsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const isAdmin = (session?.user as any)?.role === "CONEXT_ADMIN";
  const agencyId = (session?.user as any)?.agencyId;
  const userName = (session?.user as any)?.name || "Usuário";

  const loadClients = async () => {
    setIsLoading(true);
    const data = await getClients(isAdmin ? undefined : agencyId);
    setClients(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (session) loadClients();
  }, [session, isAdmin, agencyId]);

  const handleDelete = async (clientId: string) => {
    if (confirm("ATENÇÃO: Excluir um cliente removerá permanentemente todos os seus projetos e arquivos. Deseja continuar?")) {
      const res = await deleteClient(clientId);
      if (res.success) {
        loadClients();
      } else {
        alert("Erro ao excluir: " + res.error);
      }
    }
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    setEditName(client.name || "");
    setEditEmail(client.email || "");
    setEditWhatsapp(client.whatsapp || "");
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    setSavingEdit(true);
    const res = await updateClient(
      editingClient.id,
      { name: editName, email: editEmail, whatsapp: editWhatsapp || null },
      userName,
    );
    setSavingEdit(false);
    if (!res.success) {
      alert("Erro ao salvar cliente: " + (res as any).error);
      return;
    }
    setEditingClient(null);
    await loadClients();
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Base de Clientes</h1>
          <p className="text-slate-500 font-medium">Visualize e gerencie quem confia na sua operação.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <StatCard 
           label="Total de Clientes" 
           value={clients.length} 
           icon={<Users className="w-5 h-5 text-blue-600" />} 
           color="bg-blue-50"
         />
         <StatCard 
           label="Projetos Ativos" 
           value={clients.reduce((acc, curr) => acc + curr._count.projects, 0)} 
           icon={<Briefcase className="w-5 h-5 text-amber-600" />} 
           color="bg-amber-50"
         />
      </div>

      {/* Clients Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
           <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
           <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando base...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredClients.map((client) => (
            <div key={client.id} className="group bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all relative overflow-hidden">
               
               {/* Background Glow */}
               <div className="absolute -right-10 -top-10 w-32 h-32 bg-slate-50 rounded-full blur-3xl group-hover:bg-blue-50/50 transition-colors duration-500" />

               <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-xl font-black text-slate-700 shadow-inner group-hover:scale-105 transition-transform duration-300">
                         {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">{client.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                           <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                              <Mail className="w-3 h-3" /> {client.email}
                           </div>
                           {client.whatsapp && (
                             <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                               <MessageSquare className="w-3 h-3" /> {client.whatsapp}
                             </div>
                           )}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDelete(client.id)}
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projetos Gerados</span>
                          <span className="text-lg font-black text-slate-700">{client._count.projects}</span>
                       </div>
                    </div>
                    <div className="flex justify-end items-end gap-3">
                      <button
                        onClick={() => openEdit(client)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
                        title="Editar Cliente"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => router.push(`/dashboard/projects?client=${client.id}`)}
                        className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest hover:gap-3 transition-all"
                      >
                        Ver Esteira <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          ))}

          {filteredClients.length === 0 && !isLoading && (
            <div className="lg:col-span-2 p-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
               <Users className="w-12 h-12 text-slate-100 mx-auto mb-4" />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editar Cliente</p>
                <h3 className="text-lg font-black text-slate-800">{editingClient.name}</h3>
              </div>
              <button onClick={() => setEditingClient(null)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">Nome</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">E-mail</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">WhatsApp</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm"
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  placeholder="Ex: 55DDDNÚMERO"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingClient(null)}
                className="px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-900 text-white hover:bg-black disabled:opacity-50 flex items-center gap-2"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className={`p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between ${color || "bg-white"}`}>
       <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{label}</p>
          <h4 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h4>
       </div>
       <div className="p-3 bg-white rounded-2xl border border-slate-50 shadow-sm">
          {icon}
       </div>
    </div>
  );
}
