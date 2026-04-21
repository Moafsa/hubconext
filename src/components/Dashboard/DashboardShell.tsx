"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-x-hidden">
      
      {/* Mobile Overlay - Z-index 40 */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop (Static) and Mobile (Fixed) - Z-index 50 */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-900 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Header com Mobile Toggle */}
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto w-full max-w-full">
          <div className="p-4 md:p-8 lg:p-10 w-full max-w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
