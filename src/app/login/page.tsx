"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, AlertCircle, KeyRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"password" | "code">("password");
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result =
      mode === "password"
        ? await signIn("credentials", { redirect: false, email, password })
        : await signIn("dashboard-otp", { redirect: false, email, code });

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      // Redireciona para o painel Master após o login
      router.push("/dashboard");
    }
  }

  async function handleSendCode() {
    setIsSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/dashboard/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.error || `HTTP_${res.status}`);
        return;
      }

      if (data?.debugCode) {
        alert(`Código para teste (dev): ${data.debugCode}`);
      } else if (data?.warning === "SMTP_NOT_CONFIGURED" && data?.code) {
        // Ambiente local sem SMTP: mostra o código para teste.
        alert(`SMTP não configurado. Código para teste: ${data.code}`);
      } else {
        alert("Código enviado para seu e-mail. Verifique sua caixa de entrada.");
      }
    } catch (e: any) {
      setError(e?.message || "Falha ao solicitar código.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Conext Hub
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          Acesso seguro para administradores e agências
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100">

          <div className="mb-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setError("");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                mode === "password"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Senha
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("code");
                setError("");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                mode === "code"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Código
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 text-red-500 rounded-lg text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700">Email Corporativo</label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="voce@conext.click"
                />
              </div>
            </div>

            {mode === "password" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700">Senha</label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Código de Verificação</label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="000000"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isSending || !email}
                  className="w-full flex justify-center py-3 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-black text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar código para meu e-mail"}
                </button>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar no Sistema"}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Ainda não é parceiro?{" "}
              <Link href="/register" className="text-blue-600 font-black hover:text-blue-700 underline underline-offset-4">
                Cadastre sua agência
              </Link>
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
