"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const GRADES = [
  { value: "blanc", label: "Blanc" },
  { value: "jaune", label: "Jaune" },
  { value: "orange", label: "Orange" },
  { value: "vert", label: "Vert" },
  { value: "bleu", label: "Bleu" },
  { value: "rouge", label: "Rouge" },
  { value: "noir", label: "Noir" },
] as const;

/** Grades ayant un tarif propre : ceintures de couleur, puis chaque dan (clé API « noir_2 ») */
export const TARIF_GRADES: { key: string; grade: (typeof GRADES)[number]["value"]; dan?: number; label: string }[] = [
  ...GRADES.filter((g) => g.value !== "noir").map((g) => ({ key: g.value, grade: g.value, label: `Ceinture ${g.label.toLowerCase()}` })),
  ...Array.from({ length: 9 }, (_, i) => ({
    key: `noir_${i + 1}`, grade: "noir" as const, dan: i + 1, label: `Noir ${i + 1}${i === 0 ? "er" : "e"} dan`,
  })),
];

// Montant saisi : vide ou nombre positif (FCFA)
const montant = z.string().optional().refine((v) => !v?.trim() || Number(v.replace(",", ".")) >= 0, "Montant invalide");

const schema = z.object({
  titre: z.string().min(1, "Titre requis"),
  description: z.string().optional(),
  type: z.enum(["competition", "passage_grade", "stage", "cours_special"]),
  adresse: z.string().min(1, "Adresse requise"),
  date_debut: z.string().min(1, "Date de début requise"),
  date_fin: z.string().min(1, "Date de fin requise"),
  places_total: z.number().int().min(1, "Minimum 1 place"),
  date_limite_inscription: z.string().optional(),
  statut: z.enum(["brouillon", "publie"]),
  tarif_type: z.enum(["fixe", "variable"]),
  prix: montant,
  prix_par_grade: z.record(z.string(), montant).optional(),
}).refine((d) => !d.date_debut || !d.date_fin || d.date_fin >= d.date_debut, {
  message: "La fin doit être après le début",
  path: ["date_fin"],
});

export type EventFormData = z.infer<typeof schema>;

/** Date ISO de l'API → valeur d'un <input type="datetime-local"> (heure telle que saisie). */
export function toDatetimeLocal(iso?: string | null): string {
  return iso ? iso.replace(" ", "T").slice(0, 16) : "";
}

const toMontant = (v?: string) => (v?.trim() ? Number(v.replace(",", ".")) : null);

/** Tarif de l'API → valeurs du formulaire */
export function toTarifForm(ev: { tarif_type?: string | null; prix?: number | null; prix_par_grade?: Record<string, number | null> | null }) {
  return {
    tarif_type: (ev.tarif_type === "variable" ? "variable" : "fixe") as EventFormData["tarif_type"],
    prix: ev.prix != null ? String(ev.prix) : "",
    prix_par_grade: Object.fromEntries(
      Object.entries(ev.prix_par_grade ?? {}).map(([g, p]) => [g, p != null ? String(p) : ""]),
    ),
  };
}

/** Valeurs du formulaire → payload attendu par l'API ("YYYY-MM-DD HH:mm:ss"). */
export function toEventPayload(data: EventFormData) {
  const toApi = (v: string) => v.replace("T", " ") + ":00";
  const parGrade = Object.fromEntries(
    Object.entries(data.prix_par_grade ?? {})
      .map(([g, p]) => [g, toMontant(p)] as const)
      .filter(([, p]) => p !== null),
  );
  return {
    ...data,
    // Seul le tarif choisi est conservé
    prix: data.tarif_type === "fixe" ? toMontant(data.prix) : null,
    prix_par_grade: data.tarif_type === "variable" && Object.keys(parGrade).length ? parGrade : null,
    description: data.description?.trim() || null,
    date_debut: toApi(data.date_debut),
    date_fin: toApi(data.date_fin),
    date_limite_inscription: data.date_limite_inscription ? toApi(data.date_limite_inscription) : null,
  };
}

export function EventForm({
  mode,
  defaultValues,
  submitting,
  typeLocked = false,
  onSubmit,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<EventFormData>;
  submitting: boolean;
  /** Type figé (compétition terminée : ses points en dépendent) */
  typeLocked?: boolean;
  onSubmit: (data: EventFormData) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(schema) as unknown as Resolver<EventFormData>,
    defaultValues: { type: "competition", statut: "brouillon", tarif_type: "fixe", prix: "", prix_par_grade: {}, ...defaultValues },
  });

  const type = watch("type");
  const statut = watch("statut");
  const tarifType = watch("tarif_type");

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-brand-surface rounded-xl border border-brand-border p-6 space-y-5"
    >
      <h2 className="text-white font-semibold text-lg mb-1">
        {mode === "create" ? "Créer un événement" : "Modifier l'événement"}
      </h2>

      <div className="space-y-2">
        <Label className="text-white">Titre</Label>
        <Input
          placeholder="Championnat régional…"
          className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
          {...register("titre")}
        />
        {errors.titre && <p className="text-red-400 text-xs">{errors.titre.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-white">Description</Label>
        <textarea
          rows={3}
          placeholder="Programme, catégories, informations pratiques…"
          className="w-full rounded-md border border-brand-border bg-brand-black px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
          {...register("description")}
        />
      </div>

      <div className={mode === "create" ? "grid grid-cols-2 gap-4" : "space-y-2"}>
        <div className="space-y-2">
          <Label className="text-white">Type</Label>
          <Select
            value={type}
            onValueChange={(v) => {
              setValue("type", v as EventFormData["type"]);
              // À la création, un passage de grade est payé selon le grade ; les autres à prix fixe
              if (mode === "create") setValue("tarif_type", v === "passage_grade" ? "variable" : "fixe");
            }}
            disabled={typeLocked}
          >
            <SelectTrigger className="bg-brand-black border-brand-border text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-brand-surface border-brand-border text-white">
              <SelectItem value="competition">Compétition</SelectItem>
              <SelectItem value="passage_grade">Passage de grade</SelectItem>
              <SelectItem value="stage">Stage</SelectItem>
              <SelectItem value="cours_special">Cours spécial</SelectItem>
            </SelectContent>
          </Select>
          {typeLocked && (
            <p className="text-brand-muted text-xs">Compétition terminée : le type ne peut plus changer.</p>
          )}
        </div>
        {/* La publication d'un événement existant se fait depuis la liste */}
        {mode === "create" && (
          <div className="space-y-2">
            <Label className="text-white">Statut</Label>
            <Select value={statut} onValueChange={(v) => setValue("statut", v as EventFormData["statut"])}>
              <SelectTrigger className="bg-brand-black border-brand-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-brand-surface border-brand-border text-white">
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="publie">Publier immédiatement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-white">Adresse</Label>
        <Input
          placeholder="Salle omnisports de Cocody…"
          className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
          {...register("adresse")}
        />
        {errors.adresse && <p className="text-red-400 text-xs">{errors.adresse.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-white">Nombre de places</Label>
        <Input
          type="number"
          placeholder="60"
          className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
          {...register("places_total", { valueAsNumber: true })}
        />
        {errors.places_total && <p className="text-red-400 text-xs">{errors.places_total.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white">Date de début</Label>
          <Input type="datetime-local" className="bg-brand-black border-brand-border text-white" {...register("date_debut")} />
          {errors.date_debut && <p className="text-red-400 text-xs">{errors.date_debut.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-white">Date de fin</Label>
          <Input type="datetime-local" className="bg-brand-black border-brand-border text-white" {...register("date_fin")} />
          {errors.date_fin && <p className="text-red-400 text-xs">{errors.date_fin.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white">Date limite d&apos;inscription</Label>
        <Input
          type="datetime-local"
          className="bg-brand-black border-brand-border text-white"
          {...register("date_limite_inscription")}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-brand-border p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Label className="text-white">Participation</Label>
          <Select value={tarifType} onValueChange={(v) => setValue("tarif_type", v as EventFormData["tarif_type"])}>
            <SelectTrigger className="w-[220px] bg-brand-black border-brand-border text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-brand-surface border-brand-border text-white">
              <SelectItem value="fixe">Montant fixe</SelectItem>
              <SelectItem value="variable">Variable selon le grade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {tarifType === "fixe" ? (
          <div className="space-y-2">
            <div className="relative">
              <Input
                inputMode="decimal"
                placeholder="Laisser vide si gratuit"
                className="pr-16 bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
                {...register("prix")}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted text-xs">FCFA</span>
            </div>
            {errors.prix && <p className="text-red-400 text-xs">{errors.prix.message}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-brand-muted text-xs">
              Montant selon le grade actuel de l&apos;athlète. Laisser vide pour un grade non concerné.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TARIF_GRADES.map((g) => (
                <div key={g.key} className="space-y-1">
                  <span className="text-brand-muted text-xs">{g.label}</span>
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      placeholder="—"
                      className="pr-14 h-9 bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
                      {...register(`prix_par_grade.${g.key}`)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted text-xs">FCFA</span>
                  </div>
                  {errors.prix_par_grade?.[g.key] && <p className="text-red-400 text-xs">Montant invalide</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-orange hover:bg-brand-orange-light text-white font-semibold h-11"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : mode === "create" ? (
          "Créer l'événement"
        ) : (
          "Enregistrer les modifications"
        )}
      </Button>
    </form>
  );
}
