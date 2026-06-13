"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Trash2 } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface User { id: string; prenom: string; nom: string; email: string; role: "admin" | "maitre_salle" | "athlete"; created_at: string; }

const roleConfig: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-brand-orange/15 text-brand-orange border-brand-orange/30" },
  maitre_salle: { label: "Maître de salle", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  athlete: { label: "Athlète", className: "bg-brand-green/15 text-brand-green-light border-brand-green/30" },
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data.data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { toast.success("Utilisateur supprimé"); queryClient.invalidateQueries({ queryKey: ["users"] }); setDeleteTarget(null); },
    onError: () => toast.error("Erreur"),
  });

  const filtered = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    return u.nom.toLowerCase().includes(q) || u.prenom.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Utilisateurs" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
            <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-brand-surface border-brand-border text-white placeholder:text-brand-muted" />
          </div>
          <span className="text-brand-muted text-sm">{filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}</span>
        </div>

        <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />)}</div>
          ) : !filtered.length ? <EmptyState message="Aucun utilisateur" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    {["Utilisateur","Email","Rôle","Inscrit le",""].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const r = roleConfig[u.role] ?? { label: u.role, className: "bg-gray-500/15 text-gray-400 border-gray-500/30" };
                    return (
                      <tr key={u.id} className="border-b border-brand-border/50 hover:bg-white/2">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange text-xs font-bold shrink-0">
                              {u.prenom[0]}{u.nom[0]}
                            </div>
                            <span className="text-white text-sm font-medium">{u.prenom} {u.nom}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-brand-muted text-sm">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", r.className)}>{r.label}</span>
                        </td>
                        <td className="px-5 py-3 text-brand-muted text-sm">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="px-5 py-3">
                          {u.role !== "admin" && (
                            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(u)}
                              className="text-brand-muted hover:text-red-400 h-7 w-7 p-0">
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Supprimer l'utilisateur"
        description={`Supprimer le compte de ${deleteTarget?.prenom} ${deleteTarget?.nom} ? Cette action est irréversible.`}
        variant="destructive" confirmLabel="Supprimer" loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.id)} />
    </div>
  );
}
