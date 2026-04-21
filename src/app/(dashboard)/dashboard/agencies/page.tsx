import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAgencies } from "@/app/actions/db-actions";
import { 
  Users, 
  Plus, 
  MoreHorizontal, 
  MapPin, 
  Briefcase,
  Shield
} from "lucide-react";
import { redirect } from "next/navigation";

export default async function AgenciesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role !== "CONEXT_ADMIN") {
    redirect("/dashboard");
  }

  const agencies = await getAgencies();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Agências Parceiras</h1>
          <p className="text-slate-500 font-medium">Controle o acesso e visualize a performance de cada parceiro.</p>
        </div>
        
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">
          <Plus className="w-5 h-5" />
          Cadastrar Agência
        </button>
      </div>

      {/* Agencies Table/List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Agência</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Projetos</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Status Asaas</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agencies.map((agency) => (
              <tr key={agency.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                      {agency.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{agency.name}</div>
                      <div className="text-xs text-slate-400 font-medium">{agency.cnpj}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                   <div className="flex flex-col items-center">
                      <div className="text-sm font-black text-slate-700">{(agency as any)._count.projects}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Ativos</div>
                   </div>
                </td>
                <td className="px-6 py-5">
                   <div className="flex justify-center">
                      {agency.asaasCustomerId ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold ring-1 ring-emerald-100">
                           <Shield className="w-3 h-3" /> Integrado
                        </div>
                      ) : (
                        <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-400 text-xs font-bold">
                           Pendente
                        </div>
                      )}
                   </div>
                </td>
                <td className="px-6 py-5">
                   <button className="p-2 text-slate-400 hover:text-slate-600 transition-all rounded-lg hover:bg-white border border-transparent hover:border-slate-200">
                      <MoreHorizontal className="w-5 h-5" />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {agencies.length === 0 && (
          <div className="p-20 text-center">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhuma agência cadastrada ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
