"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type Agency = { id: string; name: string };
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  agencyId: string | null;
  position?: string | null;
  phone?: string | null;
  isBlocked?: boolean;
  agency?: { id: string; name: string } | null;
};

export function UsersManager({
  initialUsers,
  agencies,
}: {
  initialUsers: UserRow[];
  agencies?: Agency[];
}) {
  const { data: session } = useSession();
  const current = session?.user as any;
  const isAdmin = current?.role === "CONEXT_ADMIN";

  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  
  const [role, setRole] = useState<string>(isAdmin ? "CONEXT_ADMIN" : "AGENCY_USER");
  const [agencyId, setAgencyId] = useState<string>("");

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  async function refreshList() {
    const res = await fetch("/api/dashboard/users", { method: "GET" });
    const data = await res.json().catch(() => null);
    if (data?.success && Array.isArray(data.users)) {
      setUsers(data.users);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = { 
        name, 
        email, 
        position: position || null, 
        phone: phone || null, 
        role, 
        agencyId: agencyId || null 
      };

      const res = await fetch("/api/dashboard/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        const err = data?.error || `HTTP_${res.status}`;
        alert(`Erro ao criar usuário: ${err}`);
        return;
      }

      setName("");
      setEmail("");
      setPosition("");
      setPhone("");
      setRole(isAdmin ? "CONEXT_ADMIN" : "AGENCY_USER");
      setAgencyId("");
      await refreshList();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onToggleBlock(u: UserRow) {
    const next = !u.isBlocked;
    const confirmMsg = next ? `Bloquear o usuário "${u.name}"?` : `Liberar o usuário "${u.name}"?`;
    if (!confirm(confirmMsg)) return;

    const res = await fetch(`/api/dashboard/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: next }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      alert(`Erro: ${data?.error || `HTTP_${res.status}`}`);
      return;
    }
    await refreshList();
  }

  async function onDelete(u: UserRow) {
    if (!confirm(`Excluir o usuário "${u.name}"?`)) return;
    const res = await fetch(`/api/dashboard/users/${u.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      alert(`Erro: ${data?.error || `HTTP_${res.status}`}`);
      return;
    }
    await refreshList();
  }

  async function onEdit(u: UserRow) {
    const newName = prompt("Nome:", u.name);
    if (newName === null) return;
    const newEmail = prompt("E-mail:", u.email);
    if (newEmail === null) return;
    const newPhone = prompt("Telefone:", u.phone || "");
    if (newPhone === null) return;
    const newPosition = prompt("Cargo:", u.position || "");
    if (newPosition === null) return;

    const res = await fetch(`/api/dashboard/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail, phone: newPhone, position: newPosition }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      alert(`Erro: ${data?.error || `HTTP_${res.status}`}`);
      return;
    }
    await refreshList();
  }

  return (
    <div className="space-y-10">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Usuários</h1>
          <p className="text-slate-500 font-medium">
            {isAdmin
              ? "Crie e gerencie usuários de todas as agências."
              : "Crie usuários que acessarão o dashboard da sua agência."}
          </p>
        </div>

        <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
              placeholder="Nome do usuário"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">E-mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
              placeholder="usuario@agencia.com"
              type="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">Telefone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
              placeholder="Ex: (11) 99999-9999"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">Cargo</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
              placeholder="Ex: Atendimento, Gestor de Projetos, Diretor"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">Tipo de Usuário</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
            >
              {isAdmin && <option value="CONEXT_ADMIN">Conext Admin</option>}
              <option value="AGENCY_ADMIN">Admin da Agência</option>
              <option value="AGENCY_USER">Usuário da Agência</option>
            </select>
          </div>

          {isAdmin && role !== "CONEXT_ADMIN" && (
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">Agência</label>
              <select
                value={agencyId}
                onChange={(e) => setAgencyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
                required={role !== "CONEXT_ADMIN"}
              >
                <option value="">Selecione uma agência...</option>
                {agencies?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-2 flex justify-end pt-2">
            <button
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-sm transition-all disabled:opacity-50"
              type="submit"
            >
              {isSubmitting ? "Criando..." : "Criar usuário"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Nome</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">E-mail</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Telefone</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Cargo</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
              {isAdmin && (
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Agência</th>
              )}
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-6 py-5 font-bold text-slate-800">{u.name}</td>
                <td className="px-6 py-5 text-slate-600 font-medium">{u.email}</td>
                <td className="px-6 py-5 text-slate-600 font-medium">{u.phone || "-"}</td>
                <td className="px-6 py-5 text-slate-600 font-medium">{u.position || "-"}</td>
                <td className="px-6 py-5">
                  {u.isBlocked ? (
                    <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-black ring-1 ring-rose-100">
                      BLOQUEADO
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black ring-1 ring-emerald-100">
                      ATIVO
                    </span>
                  )}
                </td>
                <td className="px-6 py-5 text-slate-700 font-black text-xs">{u.role}</td>
                {isAdmin && <td className="px-6 py-5 text-slate-600 font-medium">{u.agency?.name || "-"}</td>}
                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50"
                      onClick={() => onEdit(u)}
                    >
                      Editar
                    </button>
                    <button
                      className={`px-3 py-2 rounded-xl text-xs font-black border ${
                        u.isBlocked
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                          : "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100"
                      }`}
                      onClick={() => onToggleBlock(u)}
                    >
                      {u.isBlocked ? "Liberar" : "Bloquear"}
                    </button>
                    <button
                      className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-black"
                      onClick={() => onDelete(u)}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedUsers.length === 0 && (
          <div className="p-16 text-center">
            <p className="text-slate-400 font-medium">Nenhum usuário encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

