"use client";

import { useState, useEffect } from "react";
import { Send, User as UserIcon, MessageSquare, Loader2 } from "lucide-react";
import { addProjectComment, getProjectInfo } from "@/app/actions/db-actions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  text: string;
  clientAuthorName?: string | null;
  user?: { name: string } | null;
  createdAt: Date;
}

interface ProjectChatProps {
  projectId: string;
  initialComments: any[];
  themeColor?: string;
  clientName: string;
}

export function ProjectChat({ projectId, initialComments, themeColor = "#3b82f6", clientName }: ProjectChatProps) {
  const [messages, setMessages] = useState<Comment[]>(initialComments);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSendMessage() {
    if (!inputText.trim() || sending) return;

    setSending(true);
    try {
      const result = await addProjectComment(
        projectId,
        inputText,
        null, // No userId when from client
        true, // Visible to client
        clientName // Author is the client
      );

      if (result.success && result.comment) {
        setMessages(prev => [...prev, result.comment as any]);
        setInputText("");
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setSending(false);
    }
  }

  // Polling para novas mensagens (Sincronização com a Agência)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fullProject = await getProjectInfo(projectId);
        if (fullProject && fullProject.comments) {
          // Filtrar apenas o que é visível para o cliente
          const visible = fullProject.comments.filter((c: any) => c.isVisibleToClient);
          setMessages(visible);
        }
      } catch (err) {
        console.error("Erro no polling do chat:", err);
      }
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [projectId]);

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden border border-slate-100">
      
      {/* Header do Chat */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white border border-slate-100 shadow-sm">
            <MessageSquare className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Conversa do Projeto</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Canal Direto</p>
          </div>
        </div>
      </div>

      {/* Lista de Mensagens */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('/grid.svg')] bg-repeat">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Nenhuma mensagem ainda.<br/>Inicie a conversa sobre o seu projeto!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isFromClient = !!msg.clientAuthorName;
            const author = msg.clientAuthorName || msg.user?.name || "Agência";
            
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isFromClient ? "items-end" : "items-start"}`}
              >
                <div className={`
                  max-w-[85%] rounded-[24px] px-5 py-3 shadow-sm border
                  ${isFromClient 
                    ? "bg-slate-900 border-slate-800 text-white rounded-tr-none" 
                    : "bg-white border-slate-100 text-slate-700 rounded-tl-none"}
                `}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{author}</span>
                  <span className="text-[10px] text-slate-300">•</span>
                  <span className="text-[10px] font-medium text-slate-300">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input de Mensagem */}
      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Digite sua mensagem..."
            className="w-full bg-white border border-slate-200 rounded-full px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 pr-14 transition-all"
            style={{ ringColor: themeColor } as any}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !inputText.trim()}
            className="absolute right-1.5 p-2 rounded-full transition-all disabled:opacity-50 disabled:grayscale"
            style={{ backgroundColor: themeColor }}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
