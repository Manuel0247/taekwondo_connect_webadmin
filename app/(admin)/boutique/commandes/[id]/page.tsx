"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Ban, CheckCircle2, Mail, Package, Phone, Truck, User } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ORDER_STATUS, apiMessage, formatDateTime, formatFcfa, type Order, type OrderStatut } from "@/lib/boutique";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

type Action = Exclude<OrderStatut, "en_attente">;

const ACTIONS: Record<Action, { label: string; titre: string; description: string }> = {
  confirmee: {
    label: "Confirmer",
    titre: "Confirmer la commande ?",
    description: "Le client est prévenu que sa commande est acceptée et que la ligue va le contacter pour le paiement et la livraison.",
  },
  livree: {
    label: "Marquer livrée",
    titre: "Commande livrée ?",
    description: "À faire une fois le produit remis au client. Le client est prévenu ; la commande ne pourra plus changer.",
  },
  annulee: {
    label: "Annuler",
    titre: "Annuler la commande ?",
    description: "Le client est prévenu avec le motif indiqué. La commande ne pourra plus changer.",
  },
};

const ROLE_LABEL: Record<string, string> = { athlete: "Athlète", maitre_salle: "Maître de salle" };

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [action, setAction] = useState<Action | null>(null);
  const [motif, setMotif] = useState("");

  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ["admin-order", id],
    queryFn: async () => (await api.get(`/admin/orders/${id}`)).data.data,
  });

  const update = useMutation({
    mutationFn: (statut: Action) => api.put(`/admin/orders/${id}/statut`, { statut, motif: statut === "annulee" ? motif.trim() || undefined : undefined }),
    onSuccess: () => {
      toast.success("Statut mis à jour, le client a été prévenu");
      setAction(null);
      setMotif("");
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["orders-pending-count"] });
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  const possibles: Action[] =
    order?.statut === "en_attente" ? ["confirmee", "livree", "annulee"] : order?.statut === "confirmee" ? ["livree", "annulee"] : [];

  const club = order?.user?.athlete?.club?.nom ?? order?.user?.clubs?.map((c) => c.nom).join(", ");

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title={order ? `Commande ${order.numero}` : "Commande"} />
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl">
        <Link href="/boutique" className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white text-sm mb-6">
          <ArrowLeft className="size-4" />
          Retour à la boutique
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-xl bg-brand-surface" />
            <Skeleton className="h-64 rounded-xl bg-brand-surface" />
          </div>
        ) : isError || !order ? (
          <p className="text-brand-muted">Commande introuvable.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
            <div className="space-y-6 min-w-0">
              {/* En-tête + actions */}
              <section className="bg-brand-surface rounded-xl border border-brand-border p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-white text-xl font-bold font-mono">{order.numero}</h2>
                  <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border", ORDER_STATUS[order.statut].className)}>
                    {ORDER_STATUS[order.statut].label}
                  </span>
                  <span className="text-brand-muted text-sm ml-auto">Passée le {formatDateTime(order.created_at)}</span>
                </div>
                {possibles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {possibles.map((a) => (
                      <Button
                        key={a}
                        onClick={() => setAction(a)}
                        variant={a === "annulee" ? "outline" : "default"}
                        className={cn(
                          a === "confirmee" && "bg-brand-orange hover:bg-brand-orange-light text-white",
                          a === "livree" && "bg-brand-green hover:bg-brand-green/90 text-white",
                          a === "annulee" && "border-red-500/40 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300",
                        )}
                      >
                        {a === "confirmee" && <CheckCircle2 className="size-4 mr-1.5" />}
                        {a === "livree" && <Truck className="size-4 mr-1.5" />}
                        {a === "annulee" && <Ban className="size-4 mr-1.5" />}
                        {ACTIONS[a].label}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-brand-muted">Cette commande est terminée : son statut ne change plus.</p>
                )}
              </section>

              {/* Articles */}
              <section className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
                <h3 className="px-5 pt-4 pb-2 text-white font-semibold">Articles</h3>
                <ul className="divide-y divide-brand-border">
                  {order.items.map((it) => (
                    <li key={it.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="size-14 shrink-0 rounded-lg overflow-hidden border border-brand-border bg-brand-black grid place-items-center">
                        {it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(it.image)} alt="" className="size-full object-cover" />
                        ) : (
                          <Package className="size-5 text-brand-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium">{it.nom_produit}</p>
                        <p className="text-brand-muted text-xs">
                          {it.taille ? `Taille ${it.taille} · ` : ""}
                          {it.quantite} × {formatFcfa(it.prix_unitaire)}
                        </p>
                      </div>
                      <p className="text-white text-sm font-semibold whitespace-nowrap">{formatFcfa(it.sous_total)}</p>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t border-brand-border px-5 py-4">
                  <span className="text-brand-muted text-sm">Total</span>
                  <span className="text-white text-lg font-bold">{formatFcfa(order.total)}</span>
                </div>
              </section>

              {order.commentaire && (
                <section className="bg-brand-surface rounded-xl border border-brand-border p-5">
                  <h3 className="text-white font-semibold mb-2">Commentaire du client</h3>
                  <p className="text-brand-muted text-sm whitespace-pre-line">{order.commentaire}</p>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <section className="bg-brand-surface rounded-xl border border-brand-border p-5 space-y-3">
                <h3 className="text-white font-semibold">Client</h3>
                {order.user ? (
                  <>
                    <p className="flex items-center gap-2 text-white text-sm">
                      <User className="size-4 text-brand-muted" />
                      {order.user.prenom} {order.user.nom}
                    </p>
                    <p className="text-brand-muted text-xs">
                      {ROLE_LABEL[order.user.role ?? ""] ?? "Utilisateur"}
                      {club ? ` · ${club}` : ""}
                    </p>
                    {(order.telephone || order.user.telephone) && (
                      <a href={`tel:${order.telephone ?? order.user.telephone}`} className="flex items-center gap-2 text-sm text-brand-orange hover:underline">
                        <Phone className="size-4" />
                        {order.telephone ?? order.user.telephone}
                      </a>
                    )}
                    {order.user.email && (
                      <a href={`mailto:${order.user.email}`} className="flex items-center gap-2 text-sm text-brand-muted hover:text-white break-all">
                        <Mail className="size-4 shrink-0" />
                        {order.user.email}
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-brand-muted text-sm">Compte supprimé</p>
                )}
              </section>

              <section className="bg-brand-surface rounded-xl border border-brand-border p-5">
                <h3 className="text-white font-semibold mb-3">Suivi</h3>
                <ol className="space-y-3 text-sm">
                  <Step label="Commande passée" date={order.created_at} done />
                  {order.statut !== "annulee" && (
                    <>
                      <Step label="Confirmée" date={order.confirmee_le} done={!!order.confirmee_le} />
                      <Step label="Livrée" date={order.livree_le} done={!!order.livree_le} />
                    </>
                  )}
                  {order.statut === "annulee" && (
                    <li>
                      <p className="text-red-400 font-medium">Annulée{order.annulee_le ? ` le ${formatDateTime(order.annulee_le)}` : ""}</p>
                      {order.motif_annulation && <p className="text-brand-muted text-xs mt-0.5">{order.motif_annulation}</p>}
                    </li>
                  )}
                </ol>
              </section>
            </aside>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={action ? ACTIONS[action].titre : ""}
        description={action ? ACTIONS[action].description : undefined}
        confirmLabel={action ? ACTIONS[action].label : "Confirmer"}
        variant={action === "annulee" ? "destructive" : "default"}
        loading={update.isPending}
        onConfirm={() => action && update.mutate(action)}
      >
        {action === "annulee" && (
          <div className="space-y-1.5">
            <Label htmlFor="motif" className="text-white">Motif (facultatif, envoyé au client)</Label>
            <textarea
              id="motif"
              rows={3}
              maxLength={500}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex. produit en rupture chez le fournisseur"
              className="w-full rounded-md border border-brand-border bg-brand-black px-3 py-2 text-sm text-white placeholder:text-brand-muted"
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

function Step({ label, date, done }: { label: string; date: string | null; done: boolean }) {
  return (
    <li className="flex gap-3">
      <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", done ? "bg-brand-green-light" : "bg-brand-border")} />
      <div>
        <p className={done ? "text-white font-medium" : "text-brand-muted"}>{label}</p>
        {date && <p className="text-brand-muted text-xs">{formatDateTime(date)}</p>}
      </div>
    </li>
  );
}
