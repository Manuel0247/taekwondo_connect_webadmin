"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, Loader2, MapPin } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

const DISCIPLINES = [
  { value: "taekwondo_sport", label: "TKD Sport" },
  { value: "taekwondo_traditionnel", label: "TKD Traditionnel" },
  { value: "poomsae", label: "Poomsae" },
  { value: "self_defense", label: "Self-Défense" },
];

const optionalNumber = z
  .string()
  .trim()
  .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Montant invalide");

const schema = z.object({
  nom: z.string().trim().min(1, "Nom du club requis"),
  description: z.string().optional(),
  adresse: z.string().trim().min(1, "Adresse requise"),
  ville: z.string().trim().min(1, "Ville requise"),
  code_postal: z.string().optional(),
  latitude: z.string().trim().refine((v) => v !== "" && Math.abs(Number(v)) <= 90, "Latitude invalide"),
  longitude: z.string().trim().refine((v) => v !== "" && Math.abs(Number(v)) <= 180, "Longitude invalide"),
  prix_mensuel: optionalNumber,
  prix_annuel: optionalNumber,
  maitre_prenom: z.string().trim().min(1, "Prénom requis"),
  maitre_nom: z.string().trim().min(1, "Nom requis"),
  // Facultatif : sans email, le maître se connecte avec l'identifiant généré
  maitre_email: z.string().trim().email("Email invalide").or(z.literal("")),
  maitre_telephone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Created {
  identifiant: string;
  mot_de_passe_provisoire: string;
  email_envoye: boolean;
  user: { prenom: string; nom: string; email: string | null };
  club: { id: string; nom: string };
}

const fieldCls = "bg-brand-black border-brand-border text-white placeholder:text-brand-muted";

/** Message lisible depuis une erreur de l'API ({ error: { message, details } }). */
function apiMessage(err: unknown): string {
  const e = (err as { response?: { data?: { error?: { message?: string; details?: Record<string, string[]> } } } })
    ?.response?.data?.error;
  const first = e?.details ? Object.values(e.details).flat()[0] : undefined;
  return first ?? e?.message ?? "Erreur lors de la création du club";
}

export default function NewClubPage() {
  const qc = useQueryClient();
  const [disciplines, setDisciplines] = useState<string[]>(["taekwondo_sport"]);
  const [locating, setLocating] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  const { register, handleSubmit, getValues, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: "", description: "", adresse: "", ville: "Cocody", code_postal: "",
      latitude: "", longitude: "", prix_mensuel: "", prix_annuel: "",
      maitre_prenom: "", maitre_nom: "", maitre_email: "", maitre_telephone: "",
    },
  });

  // Géocodage OpenStreetMap (Nominatim) à partir de l'adresse saisie
  const locate = async () => {
    const q = [getValues("adresse"), getValues("ville"), "Côte d'Ivoire"].filter(Boolean).join(", ");
    setLocating(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
      const [hit] = (await res.json()) as { lat: string; lon: string }[];
      if (!hit) {
        toast.error("Adresse introuvable : saisissez les coordonnées à la main");
        return;
      }
      setValue("latitude", Number(hit.lat).toFixed(6), { shouldValidate: true });
      setValue("longitude", Number(hit.lon).toFixed(6), { shouldValidate: true });
      toast.success("Coordonnées trouvées");
    } catch {
      toast.error("Localisation impossible pour le moment");
    } finally {
      setLocating(false);
    }
  };

  const onSubmit = async (d: FormData) => {
    try {
      const { data } = await api.post("/admin/clubs", {
        nom: d.nom,
        description: d.description || undefined,
        adresse: d.adresse,
        ville: d.ville,
        code_postal: d.code_postal || undefined,
        latitude: Number(d.latitude),
        longitude: Number(d.longitude),
        disciplines,
        prix_mensuel: d.prix_mensuel === "" ? undefined : Number(d.prix_mensuel),
        prix_annuel: d.prix_annuel === "" ? undefined : Number(d.prix_annuel),
        maitre: {
          prenom: d.maitre_prenom,
          nom: d.maitre_nom,
          email: d.maitre_email || undefined,
          telephone: d.maitre_telephone || undefined,
        },
      });
      qc.invalidateQueries({ queryKey: ["clubs"] });
      setCreated(data.data);
      toast.success("Club créé");
    } catch (err) {
      toast.error(apiMessage(err));
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title={created ? "Club créé" : "Nouveau club"} />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        <Link href="/clubs" className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white text-sm mb-6">
          <ArrowLeft className="size-4" />
          Retour aux clubs
        </Link>

        {created ? (
          <CreatedCard created={created} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <section className="bg-brand-surface rounded-xl border border-brand-border p-6 space-y-4">
              <div>
                <h2 className="text-white font-semibold">Club</h2>
                <p className="text-brand-muted text-sm">Créé par la ligue, il est validé immédiatement.</p>
              </div>
              <Field label="Nom du club" error={errors.nom?.message}>
                <Input className={fieldCls} placeholder="Dojang de Cocody" {...register("nom")} />
              </Field>
              <Field label="Description (facultatif)">
                <textarea
                  rows={3}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${fieldCls}`}
                  {...register("description")}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Adresse" error={errors.adresse?.message}>
                    <Input className={fieldCls} placeholder="Rue des Jardins, Riviera 2" {...register("adresse")} />
                  </Field>
                </div>
                <Field label="Ville" error={errors.ville?.message}>
                  <Input className={fieldCls} {...register("ville")} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                <Field label="Latitude" error={errors.latitude?.message}>
                  <Input className={fieldCls} inputMode="decimal" placeholder="5.3600" {...register("latitude")} />
                </Field>
                <Field label="Longitude" error={errors.longitude?.message}>
                  <Input className={fieldCls} inputMode="decimal" placeholder="-3.9900" {...register("longitude")} />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  onClick={locate}
                  disabled={locating}
                  className="border-brand-border bg-transparent text-white hover:bg-white/5 mb-[2px]"
                >
                  {locating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <MapPin className="size-4 mr-1.5" />}
                  Localiser l&apos;adresse
                </Button>
              </div>

              <div>
                <Label className="text-white">Disciplines</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DISCIPLINES.map((d) => {
                    const on = disciplines.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setDisciplines((p) => (on ? p.filter((x) => x !== d.value) : [...p, d.value]))}
                        className={`h-8 rounded-full border px-3 text-xs font-semibold transition-colors ${
                          on ? "border-brand-green bg-brand-green text-white" : "border-brand-border text-brand-muted hover:text-white"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Prix mensuel en FCFA (facultatif)" error={errors.prix_mensuel?.message}>
                  <Input className={fieldCls} inputMode="numeric" {...register("prix_mensuel")} />
                </Field>
                <Field label="Prix annuel en FCFA (facultatif)" error={errors.prix_annuel?.message}>
                  <Input className={fieldCls} inputMode="numeric" {...register("prix_annuel")} />
                </Field>
              </div>
            </section>

            <section className="bg-brand-surface rounded-xl border border-brand-border p-6 space-y-4">
              <div>
                <h2 className="text-white font-semibold">Maître de salle</h2>
                <p className="text-brand-muted text-sm">
                  Son compte est créé avec un identifiant et un mot de passe provisoire. L&apos;email est facultatif.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Prénom" error={errors.maitre_prenom?.message}>
                  <Input className={fieldCls} {...register("maitre_prenom")} />
                </Field>
                <Field label="Nom" error={errors.maitre_nom?.message}>
                  <Input className={fieldCls} {...register("maitre_nom")} />
                </Field>
                <Field label="Email (facultatif)" error={errors.maitre_email?.message}>
                  <Input type="email" className={fieldCls} placeholder="exemple@email.com" {...register("maitre_email")} />
                </Field>
                <Field label="Téléphone (facultatif)">
                  <Input type="tel" className={fieldCls} {...register("maitre_telephone")} />
                </Field>
              </div>
            </section>

            <Button type="submit" disabled={isSubmitting} className="bg-brand-orange hover:bg-brand-orange-light text-white">
              {isSubmitting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Créer le club
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-white">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function CreatedCard({ created }: { created: Created }) {
  const [copied, setCopied] = useState(false);
  const { user, identifiant, mot_de_passe_provisoire, email_envoye, club } = created;

  const copy = async () => {
    const text =
      `Bonjour ${user.prenom}, votre compte de maître de salle LCC Taekwondo (club ${club.nom}) a été créé.\n` +
      `Identifiant : ${identifiant}\nMot de passe provisoire : ${mot_de_passe_provisoire}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Identifiants copiés");
    } catch {
      toast.error("Copie impossible, notez les identifiants à la main");
    }
  };

  return (
    <div className="bg-brand-surface rounded-xl border border-brand-border p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-full bg-brand-green">
          <Check className="size-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold">{club.nom} est créé et validé</p>
          <p className="text-brand-muted text-sm">
            Maître de salle : {user.prenom} {user.nom}
          </p>
        </div>
      </div>

      <p className="text-sm text-brand-muted">
        {email_envoye
          ? `Les identifiants ont été envoyés à ${user.email}. Notez-les aussi au cas où.`
          : "Transmettez ces identifiants au maître de salle : ils ne seront plus affichés ensuite."}
      </p>

      <dl className="rounded-lg border border-brand-border bg-brand-black p-5 space-y-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-muted">Identifiant</dt>
          <dd className="font-mono text-lg font-bold text-white select-all">{identifiant}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-muted">Mot de passe provisoire</dt>
          <dd className="font-mono text-lg font-bold text-white select-all">{mot_de_passe_provisoire}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <Button onClick={copy} className="bg-brand-green hover:bg-brand-green/90 text-white">
          {copied ? <Check className="size-4 mr-1.5" /> : <Copy className="size-4 mr-1.5" />}
          {copied ? "Copié" : "Copier les identifiants"}
        </Button>
        <Link href={`/clubs/${club.id}`}>
          <Button variant="outline" className="border-brand-border bg-transparent text-white hover:bg-white/5">
            Voir la fiche du club
          </Button>
        </Link>
      </div>
    </div>
  );
}
