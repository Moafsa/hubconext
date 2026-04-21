import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getProjects, getAgencies } from "@/app/actions/db-actions";
import { 
  Briefcase, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Settings
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any).role;
  const agencyId = (session?.user as any).agencyId;

  const projects = await getProjects(role === "CONEXT_ADMIN" ? null : agencyId);
  const agencies = role === "CONEXT_ADMIN" ? await getAgencies() : [];

  // Cálculos de Status
  const activeProjects = projects.filter(p => ["IN_DEVELOPMENT", "TESTING"].includes(p.status)).length;
  const pendingProjects = projects.filter(p => ["NEGOTIATING", "WAITING_INITIAL_PAY", "WAITING_BRIEFING"].includes(p.status)).length;
  const doneProjects = projects.filter(p => p.status === "DELIVERED").length;

  const stats = [
    { name: "Total de Projetos", value: projects.length, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { name: "Em Produção", value: activeProjects, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { name: "Pendentes/Negociação", value: pendingProjects, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { name: "Concluídos", value: doneProjects, icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-10">
      
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
          Olá, {session?.user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Aqui está o resumo do que está acontecendo no {role === "CONEXT_ADMIN" ? "Conext Hub" : "seu painel"}.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
               <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
               </div>
               <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Global</span>
            </div>
            <div className="text-3xl font-black text-slate-800">{stat.value}</div>
            <div className="text-sm font-bold text-slate-500 mt-1">{stat.name}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity / Quick Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Últimos Pedidos</h3>
            <Link href="/dashboard/projects" className="text-xs font-bold text-blue-600 hover:underline">Ver todos</Link>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {projects.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-medium">Nenhum projeto encontrado.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projects.slice(0, 5).map((project) => (
                  <div key={project.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                          {project.title.charAt(0)}
                       </div>
                       <div>
                          <div className="font-bold text-slate-800">{project.title}</div>
                          <div className="text-xs text-slate-400 font-medium">{project.client.name}</div>
                       </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-tight">
                       {project.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Master Info */}
        <div className="space-y-6">
          <div className="px-2">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Ações Rápidas</h3>
          </div>
          
          <div className="space-y-3">
             {role === "CONEXT_ADMIN" ? (
                <>
                  <Link href="/admin" className="flex items-center gap-3 p-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all">
                     <AlertCircle className="w-5 h-5 text-amber-400" />
                     Gerenciar Kanban Master
                  </Link>
                  <Link href="/dashboard/agencies" className="flex items-center gap-3 p-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all">
                     <Users className="w-5 h-5 text-blue-600" />
                     Listar Todas as Agências
                  </Link>
                </>
             ) : (
                <>
                  <Link 
                    href="/dashboard/projects?new=true" 
                    className="w-full flex items-center gap-3 p-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                     <Briefcase className="w-5 h-5" />
                     Novo Pedido de Projeto
                  </Link>
                  <Link href="/dashboard/settings" className="flex items-center gap-3 p-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all">
                     <Settings className="w-5 h-5 text-slate-400" />
                     Configurar Minha Marca
                  </Link>
                </>
             )}
          </div>
        </div>

      </div>

    </div>
  );
}
