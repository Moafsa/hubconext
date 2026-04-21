import Link from "next/link";
import { 
  ShieldCheck, 
  Zap, 
  Layers, 
  Users, 
  ArrowRight, 
  CheckCircle2,
  Lock,
  MessageSquare,
  Globe
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
             </div>
             <span className="text-lg font-black tracking-tighter text-slate-800">Conext<span className="text-blue-600">Hub</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
             <a href="#features" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Funcionalidades</a>
             <a href="#white-label" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">White-Label</a>
             <Link href="/login" className="px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-black hover:bg-black transition-all shadow-lg shadow-slate-900/10">
                Acessar Painel
             </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32">
        
        {/* Hero Section */}
        <section className="px-6 relative">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-8 animate-fade-in">
               <Zap className="w-4 h-4" /> O Sistema Definitivo para Agências
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tight leading-[0.9] mb-8">
               Briefing Inteligente.<br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  White-Label Real.
               </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed mb-12">
               Centralize a coleta de materiais, acompanhamento e entrega de projetos em um portal exclusivo com a <span className="text-slate-900 font-bold">sua marca</span>.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
               <Link href="/login" className="w-full md:w-auto px-10 py-5 rounded-[24px] bg-blue-600 text-white font-black text-lg hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-2">
                  Começar Agora <ArrowRight className="w-5 h-5" />
               </Link>
               <button className="w-full md:w-auto px-10 py-5 rounded-[24px] bg-white border border-slate-200 text-slate-700 font-black text-lg hover:bg-slate-50 transition-all">
                  Ver Demonstração
               </button>
            </div>
          </div>

          {/* Abstract background elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-blue-100/30 blur-[120px] rounded-full -z-10" />
        </section>

        {/* Features Grid */}
        <section id="features" className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
             <div className="text-center mb-20">
                <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.3em] mb-4">Potencialize Sua agência</h2>
                <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Tudo o que você precisa em um só lugar</h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                
                <FeatureCard 
                  icon={Lock} 
                  title="Cofre de Materiais" 
                  desc="Seu cliente sobe logos, textos e referências direto no seu MinIO/S3 privado. Organizador e seguro." 
                  color="bg-blue-500"
                />
                <FeatureCard 
                  icon={Layers} 
                  title="Multi-Projetos" 
                  desc="Gerencie múltiplos clientes e demandas com links únicos e barras de acompanhamento automáticas." 
                  color="bg-indigo-500"
                />
                <FeatureCard 
                  icon={MessageSquare} 
                  title="Canal de Chat" 
                  desc="Centralize a comunicação do projeto no portal. Sem e-mails perdidos ou mensagens soltas no WhatsApp." 
                  color="bg-purple-500"
                />
                <FeatureCard 
                  icon={Globe} 
                  title="White-Label Full" 
                  desc="O portal do cliente leva suas cores, seu logotipo e é gerido com exclusividade pela sua marca." 
                  color="bg-emerald-500"
                />
                <FeatureCard 
                  icon={Users} 
                  title="Painel de Agência" 
                  desc="Dashboard completo para acompanhar todos os projetos que você terceiriza com o time Conext." 
                  color="bg-amber-500"
                />
                <FeatureCard 
                  icon={CheckCircle2} 
                  title="Aprovação Ágil" 
                  desc="Sistema de homologação integrado. O cliente valida cada etapa do projeto em um clique." 
                  color="bg-rose-500"
                />

             </div>
          </div>
        </section>

        {/* White-label Showcase */}
        <section id="white-label" className="py-32 bg-slate-900 text-white rounded-[60px] mx-4 md:mx-10 overflow-hidden relative">
           <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                 <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">
                    Não é sobre nós.<br/>É sobre a <span className="text-blue-500 italic underline decoration-wavy">Sua Marca</span>.
                 </h2>
                 <p className="text-slate-400 text-xl font-medium leading-relaxed mb-10">
                    O Conext Hub desaparece para que sua agência brilhe. Cada cliente recebe um link exclusivo onde tudo o que ele vê é a sua identidade visual.
                 </p>
                 <ul className="space-y-4">
                    {[
                      "Customização de Cores Hex",
                      "Logotipo da Agência no Header",
                      "Subdomínio Personalizado (em breve)",
                      "Ambiente Blindado e Profissional"
                    ].map(item => (
                      <li key={item} className="flex items-center gap-3 font-bold text-slate-300">
                         <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-blue-500" />
                         </div>
                         {item}
                      </li>
                    ))}
                 </ul>
              </div>
              <div className="relative">
                 <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] p-8 aspect-video shadow-2xl flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                       <div className="w-12 h-12 bg-white/20 rounded-xl" />
                       <div className="px-4 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">Client Portal</div>
                    </div>
                    <div className="space-y-4">
                       <div className="h-4 w-3/4 bg-white/30 rounded-full" />
                       <div className="h-4 w-1/2 bg-white/20 rounded-full" />
                    </div>
                    <div className="flex gap-2">
                       <div className="h-10 w-full bg-white rounded-2xl" />
                       <div className="h-10 w-10 bg-white/10 rounded-2xl" />
                    </div>
                 </div>
                 {/* Decorative elements */}
                 <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/20 blur-[60px] rounded-full" />
              </div>
           </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-200 bg-white mt-10">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
               </div>
               <span className="text-lg font-black tracking-tighter text-slate-800">Conext<span className="text-blue-600">Hub</span></span>
            </div>
            <p className="text-slate-400 text-sm font-medium">© 2026 Conext Hub. Todos os direitos reservados para agências parceiras.</p>
            <div className="flex gap-6">
               <a href="#" className="text-slate-400 hover:text-slate-900"><Zap className="w-5 h-5" /></a>
               <a href="#" className="text-slate-400 hover:text-slate-900"><Globe className="w-5 h-5" /></a>
            </div>
         </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color }: any) {
  return (
    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group">
       <div className={`w-14 h-14 rounded-2xl ${color} text-white flex items-center justify-center mb-8 shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform`}>
          <Icon className="w-7 h-7" />
       </div>
       <h4 className="text-xl font-black text-slate-800 mb-4 tracking-tight">{title}</h4>
       <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
