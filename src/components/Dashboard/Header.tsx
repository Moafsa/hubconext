"use client";

import { useSession } from "next-auth/react";
import { Bell, Search, User, Menu } from "lucide-react";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession();

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10 w-full">
      
      <div className="flex items-center gap-4">
        {/* Mobile Toggle */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="hidden md:flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 w-64 lg:w-96">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Procurar..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-2 md:gap-4 pl-3 md:pl-6 border-l border-slate-200">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800 line-clamp-1">{session?.user?.name}</span>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
              {(session?.user as any)?.role === "CONEXT_ADMIN" ? "CONEXT" : "AGÊNCIA"}
            </span>
          </div>
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 text-sm md:text-base cursor-default flex-shrink-0">
            {session?.user?.name?.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}
