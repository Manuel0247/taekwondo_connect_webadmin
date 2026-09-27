"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Users, Mail, Phone, Euro,
  CheckCircle2, XCircle, PauseCircle, FileText,
  Image as ImageIcon, Clock, Dumbbell, BookOpen,
  CalendarCheck, AlertCircle, Loader2,
} from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { ClubStatusBadge } from "@/components/admin/ClubStatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

type ActionType = "validate" | "reject" | "suspend" | null;

interface Horaire { jour?: string; ouverture?: string; fermeture?: string; [key: string]: string | undefined; }

export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [actionType, setActionType] = useState<ActionType>(null);
  const [motif, setMotif] = useState("");

  const { data: club, isLoading } = useQuery({
    queryKey: ["club-detail", id],
    queryFn: async () => {
      const res = await api.get(`/clubs/${id}`);
      return res.data.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (type: ActionType) => {
      if (type === "validate") return api.put(`/admin/clubs/${id}/validate`);
      if (type === "reject")   return api.put(`/admin/clubs/${id}/reject`, { motif });
      if (type === "suspend")  return api.put(`/admin/clubs/${id}/suspend`);
    },
    onSuccess: () => {
      const labels: Record<string, string> = { validate: "validé", reject: "refusé", suspend: "suspendu" };
      toast.success(`Club ${labels[actionType!] ?? "mis à jour"}`);
      queryClient.invalidateQueries({ queryKey: ["club-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["pending-clubs"] });
      setActionType(null);
      setMotif("");
    },
    onError: () => toast.error("Une erreur est survenue"),
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Détail du club" />
      <div className="flex-1 overflow-y-auto p-6">
        <Link
          href="/clubs"
          className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft className="size-4" />
          Retour aux clubs
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl bg-brand-surface" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-36 rounded-xl bg-brand-surface" />
              <Skeleton className="h-36 rounded-xl bg-brand-surface" />
            </div>
            <Skeleton className="h-48 rounded-xl bg-brand-surface" />
          </div>
        ) : !club ? (
          <div className="flex items-center gap-2 text-brand-muted py-12 justify-center">
            <AlertCircle className="size-5" />
            Club introuvable
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Hero ── */}
            <div className="bg-brand-surface rounded-xl border border-brand-border p-6">
              <div className="flex items-start gap-5 flex-wrap">
                {/* Logo */}
                {club.logo_url ? (
                  <img
                    src={club.logo_url}
                    alt={club.nom}
                    className="w-20 h-20 rounded-xl object-cover border border-brand-border shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-brand-black border border-brand-border flex items-center justify-center shrink-0">
                    <ImageIcon className="size-8 text-brand-muted" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-white text-2xl font-bold">{club.nom}</h2>
                    <ClubStatusBadge status={club.statut} />
                  </div>
                  <div className="flex items-center gap-1.5 text-brand-muted text-sm mt-1">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>
                      {[club.adresse, club.ville, club.code_postal, club.pays]
                        .filter(Boolean).join(", ")}
                    </span>
                  </div>
                  {club.description && (
                    <p className="text-brand-muted text-sm mt-3 leading-relaxed">{club.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {club.statut === "en_attente" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setActionType("validate")}
                        className="bg-brand-green hover:bg-brand-green-light text-white"
                      >
                        <CheckCircle2 className="size-4 mr-1.5" />Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActionType("reject")}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle className="size-4 mr-1.5" />Refuser
                      </Button>
                    </>
                  )}
                  {club.statut === "valide" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActionType("suspend")}
                      className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                    >
                      <PauseCircle className="size-4 mr-1.5" />Suspendre
                    </Button>
                  )}
                  {(club.statut === "suspendu" || club.statut === "refuse") && (
                    <Button
                      size="sm"
                      onClick={() => setActionType("validate")}
                      className="bg-brand-green hover:bg-brand-green-light text-white"
                    >
                      <CheckCircle2 className="size-4 mr-1.5" />Réactiver
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Grid top ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {/* Maître de salle */}
              <Section icon={Users} title="Maître de salle">
                {club.maitre_salle ? (
                  <div className="space-y-2">
                    <Row icon={Users} label="Nom" value={`${club.maitre_salle.prenom ?? ""} ${club.maitre_salle.nom ?? ""}`} />
                    {club.maitre_salle.email && <Row icon={Mail} label="Email" value={club.maitre_salle.email} />}
                    {club.maitre_salle.telephone && <Row icon={Phone} label="Tél." value={club.maitre_salle.telephone} />}
                  </div>
                ) : (
                  <p className="text-brand-muted text-sm">Non renseigné</p>
                )}
              </Section>

              {/* Tarifs */}
              <Section icon={Euro} title="Tarifs">
                <div className="space-y-2">
                  <Row icon={Euro} label="Mensuel"
                    value={club.prix_mensuel != null ? `${Number(club.prix_mensuel).toLocaleString("fr-FR")} FCFA` : "—"} />
                  <Row icon={Euro} label="Annuel"
                    value={club.prix_annuel != null ? `${Number(club.prix_annuel).toLocaleString("fr-FR")} FCFA` : "—"} />
                </div>
              </Section>

              {/* Localisation */}
              <Section icon={MapPin} title="Localisation">
                <div className="space-y-2">
                  {club.adresse   && <Row icon={MapPin} label="Adresse"  value={club.adresse} />}
                  {club.ville     && <Row icon={MapPin} label="Ville"    value={club.ville} />}
                  {club.code_postal && <Row icon={MapPin} label="Code postal" value={club.code_postal} />}
                  {club.pays      && <Row icon={MapPin} label="Pays"     value={club.pays} />}
                  {club.latitude  && <Row icon={MapPin} label="GPS"      value={`${club.latitude}, ${club.longitude}`} />}
                </div>
              </Section>
            </div>

            {/* ── Disciplines & Équipements ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Section icon={Dumbbell} title="Disciplines">
                {club.disciplines?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {club.disciplines.map((d: string) => (
                      <span key={d} className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-brand-muted text-sm">Non renseigné</p>
                )}
              </Section>

              <Section icon={Dumbbell} title="Équipements">
                {club.equipements?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {club.equipements.map((e: string) => (
                      <span key={e} className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-surface border border-brand-border text-white">
                        {e}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-brand-muted text-sm">Non renseigné</p>
                )}
              </Section>
            </div>

            {/* ── Horaires ── */}
            {club.horaires?.length > 0 && (
              <Section icon={Clock} title="Horaires">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(club.horaires as Horaire[]).map((h, i) => (
                    <div key={i} className="flex items-center justify-between bg-brand-black rounded-lg px-3 py-2">
                      <span className="text-white text-sm font-medium capitalize">
                        {h.jour ?? Object.keys(h)[0] ?? `Séance ${i + 1}`}
                      </span>
                      <span className="text-brand-muted text-sm">
                        {h.ouverture && h.fermeture
                          ? `${h.ouverture} – ${h.fermeture}`
                          : h.ouverture ?? h.fermeture ?? Object.values(h).filter(Boolean).join(" ")}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Photos ── */}
            {club.photos_urls?.length > 0 && (
              <Section icon={ImageIcon} title={`Photos (${club.photos_urls.length})`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {club.photos_urls.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`Photo ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border border-brand-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Documents ── */}
            {club.documents_urls?.length > 0 && (
              <Section icon={FileText} title={`Documents (${club.documents_urls.length})`}>
                <div className="space-y-2">
                  {club.documents_urls.map((url: string, i: number) => {
                    const filename = url.split("/").pop() ?? `Document ${i + 1}`;
                    return (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-brand-black rounded-lg px-4 py-2.5 hover:bg-white/5 transition-colors"
                      >
                        <FileText className="size-4 text-brand-orange shrink-0" />
                        <span className="text-white text-sm truncate">{filename}</span>
                        <span className="text-brand-muted text-xs ml-auto shrink-0">Ouvrir →</span>
                      </a>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* ── Validation info ── */}
            {(club.valide_le || club.motif_refus) && (
              <Section
                icon={CalendarCheck}
                title="Historique de validation"
                className={cn(
                  club.statut === "refuse" && "border-red-500/30",
                  club.statut === "valide" && "border-brand-green/30",
                )}
              >
                <div className="space-y-2">
                  {club.valide_le && (
                    <Row icon={CalendarCheck} label="Date de décision"
                      value={new Date(club.valide_le).toLocaleString("fr-FR")} />
                  )}
                  {club.motif_refus && (
                    <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                      <p className="text-red-400 text-xs font-medium uppercase tracking-wider mb-1">Motif de refus</p>
                      <p className="text-white text-sm">{club.motif_refus}</p>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* ── Stats bottom ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-surface rounded-xl border border-brand-border p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-orange/15 flex items-center justify-center">
                  <Users className="size-5 text-brand-orange" />
                </div>
                <div>
                  <p className="text-brand-muted text-xs">Athlètes</p>
                  <p className="text-white text-2xl font-bold">{club.nb_athletes ?? club.athletes_count ?? 0}</p>
                </div>
              </div>
              <div className="bg-brand-surface rounded-xl border border-brand-border p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <BookOpen className="size-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-brand-muted text-xs">Cours</p>
                  <p className="text-white text-2xl font-bold">{club.courses_count ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!actionType}
        onOpenChange={(open) => { if (!open) { setActionType(null); setMotif(""); } }}
        title={
          actionType === "validate" ? "Valider le club"
          : actionType === "reject"   ? "Refuser le club"
          : "Suspendre le club"
        }
        description={
          actionType === "validate"
            ? `Confirmer la validation du club "${club?.nom}" ?`
            : actionType === "reject"
            ? `Confirmer le refus du club "${club?.nom}" ?`
            : `Suspendre le club "${club?.nom}" ? Les membres ne pourront plus accéder aux services.`
        }
        variant={actionType === "validate" ? "default" : "destructive"}
        confirmLabel={
          actionType === "validate" ? "Valider"
          : actionType === "reject"   ? "Refuser"
          : "Suspendre"
        }
        loading={actionMutation.isPending}
        onConfirm={() => actionMutation.mutate(actionType)}
      >
        {actionType === "reject" && (
          <div className="space-y-2">
            <Label className="text-white">Motif du refus <span className="text-red-400">*</span></Label>
            <Input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Documents insuffisants, informations manquantes…"
              className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

/* ── Helper components ── */

function Section({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-brand-surface rounded-xl border border-brand-border p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="size-4 text-brand-orange" />
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="size-3.5 text-brand-muted shrink-0 mt-0.5" />
      <span className="text-brand-muted text-xs w-20 shrink-0">{label}</span>
      <span className="text-white text-sm">{value}</span>
    </div>
  );
}
