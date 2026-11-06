"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ClipboardCheck, CalendarDays } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { GradeChip } from "@/components/admin/GradeChip";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";

/* Classement par événement terminé : compétitions (résultats) et passages de grade (notes). Lecture seule. */

type EventKind = "competition" | "passage_grade";

interface RankedEvent {
  id: string;
  titre: string;
  type: EventKind;
  date_debut: string;
}

interface Participant {
  id: string;
  prenom: string;
  nom: string;
  club: string | null;
  grade: string | null;
  dan: number | null;
  categorie_poids: string | null;
  resultat: string | null;
  points: number | null;
  note: number | null;
}

const RESULTAT_ORDRE: Record<string, number> = { or: 1, argent: 2, bronze: 3, participant: 4 };
const RESULTAT_LABEL: Record<string, string> = { or: "🥇 Or", argent: "🥈 Argent", bronze: "🥉 Bronze", participant: "Participant" };

const FILTRES: { value: "tous" | EventKind; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "competition", label: "Compétitions" },
  { value: "passage_grade", label: "Passages de grade" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: any): Participant {
  const athlete = raw.athlete ?? {};
  const user = athlete.user ?? {};
  return {
    id: raw.id,
    prenom: user.prenom ?? "—",
    nom: user.nom ?? "",
    club: athlete.club?.nom ?? null,
    grade: athlete.grade ?? null,
    dan: athlete.dan ?? null,
    categorie_poids: athlete.categorie_poids ?? null,
    resultat: raw.resultat ?? null,
    points: raw.points ?? null,
    note: raw.note != null ? Number(raw.note) : null,
  };
}

/** Rang avec ex æquo : deux valeurs égales partagent le même rang */
function withRanks<T>(items: T[], key: (item: T) => number | null): { item: T; rang: number | null }[] {
  let rang = 0;
  let previous: number | null | undefined;
  return items.map((item, i) => {
    const value = key(item);
    if (value == null) return { item, rang: null };
    if (value !== previous) rang = i + 1;
    previous = value;
    return { item, rang };
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function RankBadge({ rang }: { rang: number | null }) {
  if (rang == null) return <span className="text-brand-muted text-sm">—</span>;
  const cls =
    rang === 1 ? "bg-yellow-500 text-white"
    : rang === 2 ? "bg-gray-400 text-white"
    : rang === 3 ? "bg-amber-600 text-white"
    : "bg-brand-black text-brand-muted";
  return <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${cls}`}>{rang}</span>;
}

function GradeCell({ grade, dan }: { grade: string | null; dan: number | null }) {
  return grade
    ? <GradeChip grade={grade as Parameters<typeof GradeChip>[0]["grade"]} dan={dan} />
    : <span className="text-brand-muted text-sm">—</span>;
}

const th = "text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider";

function EventRanking({ event }: { event: RankedEvent }) {
  const [poids, setPoids] = useState("toutes");

  const { data: participants = [], isLoading } = useQuery<Participant[]>({
    queryKey: ["event-inscriptions", event.id],
    queryFn: async () => {
      const res = await api.get(`/events/${event.id}/inscriptions`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (res.data.data ?? []).filter((i: any) => i.statut === "confirme").map(normalize);
    },
  });

  if (isLoading) {
    return <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />)}</div>;
  }
  if (!participants.length) return <EmptyState message="Aucun participant confirmé" />;

  if (event.type === "passage_grade") {
    const sorted = [...participants].sort((a, b) =>
      (b.note ?? -1) - (a.note ?? -1) || a.nom.localeCompare(b.nom));
    return (
      <table className="w-full">
        <thead>
          <tr className="border-b border-brand-border">
            <th className={th}>#</th><th className={th}>Athlète</th><th className={th}>Club</th><th className={th}>Grade</th>
            <th className={`${th} text-right`}>Note</th>
          </tr>
        </thead>
        <tbody>
          {withRanks(sorted, (p) => p.note).map(({ item: p, rang }) => (
            <tr key={p.id} className="border-b border-brand-border/50">
              <td className="px-5 py-3"><RankBadge rang={rang} /></td>
              <td className="px-5 py-3 text-white text-sm font-medium">{p.prenom} {p.nom}</td>
              <td className="px-5 py-3 text-brand-muted text-sm">{p.club ?? "—"}</td>
              <td className="px-5 py-3"><GradeCell grade={p.grade} dan={p.dan} /></td>
              <td className="px-5 py-3 text-right text-sm">
                {p.note != null ? <span className="text-brand-orange font-bold">{p.note}</span> : <span className="text-brand-muted">Non noté</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Compétition : classement par résultat, éventuellement par catégorie de poids
  const categories = [...new Set(participants.map((p) => p.categorie_poids).filter((c): c is string => !!c))].sort();
  const visibles = poids === "toutes" ? participants : participants.filter((p) => p.categorie_poids === poids);
  const sorted = [...visibles].sort((a, b) =>
    (RESULTAT_ORDRE[a.resultat ?? ""] ?? 5) - (RESULTAT_ORDRE[b.resultat ?? ""] ?? 5) || a.nom.localeCompare(b.nom));

  return (
    <>
      {categories.length > 1 && (
        <div className="px-5 pt-4">
          <Select value={poids} onValueChange={setPoids}>
            <SelectTrigger className="w-[200px] h-8 bg-brand-black border-brand-border text-white text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-brand-surface border-brand-border text-white">
              <SelectItem value="toutes">Toutes les catégories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <table className="w-full mt-2">
        <thead>
          <tr className="border-b border-brand-border">
            <th className={th}>#</th><th className={th}>Athlète</th><th className={th}>Club</th><th className={th}>Grade</th>
            <th className={th}>Poids</th><th className={th}>Résultat</th><th className={`${th} text-right`}>Points</th>
          </tr>
        </thead>
        <tbody>
          {withRanks(sorted, (p) => (p.resultat ? RESULTAT_ORDRE[p.resultat] ?? null : null)).map(({ item: p, rang }) => (
            <tr key={p.id} className="border-b border-brand-border/50">
              <td className="px-5 py-3"><RankBadge rang={rang} /></td>
              <td className="px-5 py-3 text-white text-sm font-medium">{p.prenom} {p.nom}</td>
              <td className="px-5 py-3 text-brand-muted text-sm">{p.club ?? "—"}</td>
              <td className="px-5 py-3"><GradeCell grade={p.grade} dan={p.dan} /></td>
              <td className="px-5 py-3 text-brand-muted text-sm">{p.categorie_poids ?? "—"}</td>
              <td className="px-5 py-3 text-white text-sm">{p.resultat ? RESULTAT_LABEL[p.resultat] ?? p.resultat : "—"}</td>
              <td className="px-5 py-3 text-right text-sm">
                {p.points != null ? <span className="text-brand-orange font-bold">{p.points} pts</span> : <span className="text-brand-muted">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function RankingsPage() {
  const [filtre, setFiltre] = useState<"tous" | EventKind>("tous");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery<RankedEvent[]>({
    queryKey: ["events", "termine"],
    queryFn: async () => {
      const res = await api.get("/admin/events", { params: { statut: "termine", limit: 200 } });
      return (res.data.data ?? []).filter((e: RankedEvent) => e.type === "competition" || e.type === "passage_grade");
    },
  });

  const visibles = events.filter((e) => filtre === "tous" || e.type === filtre);
  const selected = visibles.find((e) => e.id === selectedId) ?? visibles[0] ?? null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Classements" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTRES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltre(f.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                filtre === f.value
                  ? "bg-brand-orange border-brand-orange text-white"
                  : "bg-brand-surface border-brand-border text-brand-muted hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg bg-brand-surface" />)}</div>
        ) : !visibles.length ? (
          <div className="bg-brand-surface rounded-xl border border-brand-border">
            <EmptyState message="Aucun événement terminé. Le classement apparaît ici une fois une compétition ou un passage de grade clôturé." />
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[300px_1fr] items-start">
            <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
              {visibles.map((e) => {
                const actif = selected?.id === e.id;
                const Icon = e.type === "competition" ? Trophy : ClipboardCheck;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelectedId(e.id)}
                    className={`w-full text-left px-4 py-3 border-b border-brand-border/50 last:border-b-0 flex gap-3 items-start transition-colors border-l-2 ${
                      actif ? "bg-white/5 border-l-brand-orange" : "border-l-transparent hover:bg-white/2"
                    }`}
                  >
                    <Icon className={`size-4 mt-0.5 shrink-0 ${e.type === "competition" ? "text-brand-orange" : "text-blue-400"}`} />
                    <span className="min-w-0">
                      <span className="block text-white text-sm font-medium truncate">{e.titre}</span>
                      <span className="flex items-center gap-1 text-brand-muted text-xs mt-0.5">
                        <CalendarDays className="size-3" />{formatDate(e.date_debut)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
                <div className="px-5 py-4 border-b border-brand-border">
                  <h3 className="text-white font-semibold">{selected.titre}</h3>
                  <p className="text-brand-muted text-xs mt-0.5">
                    {selected.type === "competition" ? "Compétition" : "Passage de grade"} · {formatDate(selected.date_debut)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <EventRanking key={selected.id} event={selected} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
