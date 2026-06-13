"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { z } from "zod";
import api from "@/lib/api";
import { useState } from "react";

const schema = z.object({
  titre: z.string().min(1, "Titre requis"),
  message: z.string().min(1, "Message requis"),
  type: z.enum(["general", "evenement", "inscription", "validation", "badge"]),
  segment: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

interface Notif { id: string; titre: string; message: string; type: string; created_at: string; }

export default function NotificationsPage() {
  const [sent, setSent] = useState<Notif[]>([]);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as unknown as Resolver<FormData>,
    defaultValues: { type: "general", segment: "All" },
  });

  const broadcastMutation = useMutation({
    mutationFn: (data: FormData) => api.post("/admin/notifications/broadcast", data),
    onSuccess: (_, vars) => {
      toast.success("Broadcast envoyé !");
      setSent((prev) => [{ id: Date.now().toString(), titre: vars.titre, message: vars.message, type: vars.type, created_at: new Date().toISOString() }, ...prev]);
      reset();
    },
    onError: () => toast.error("Erreur lors de l'envoi"),
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Notifications" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Broadcast form */}
        <div className="bg-brand-surface rounded-xl border border-brand-border p-6 max-w-2xl">
          <h2 className="text-white font-semibold text-base mb-4">Envoyer un broadcast</h2>
          <form onSubmit={handleSubmit((d) => broadcastMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white">Titre</Label>
              <Input placeholder="Annonce importante…" className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted" {...register("titre")} />
              {errors.titre && <p className="text-red-400 text-xs">{errors.titre.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-white">Message</Label>
              <Input placeholder="Corps de la notification…" className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted" {...register("message")} />
              {errors.message && <p className="text-red-400 text-xs">{errors.message.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white">Type</Label>
                <Select defaultValue="general" onValueChange={(v) => setValue("type", v as FormData["type"])}>
                  <SelectTrigger className="bg-brand-black border-brand-border text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-brand-surface border-brand-border text-white">
                    {[["general","Général"],["evenement","Événement"],["inscription","Inscription"],["validation","Validation"],["badge","Badge"]].map(([v,l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white">Segment</Label>
                <Select defaultValue="All" onValueChange={(v) => setValue("segment", v)}>
                  <SelectTrigger className="bg-brand-black border-brand-border text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-brand-surface border-brand-border text-white">
                    <SelectItem value="All">Tous</SelectItem>
                    <SelectItem value="athlete">Athlètes</SelectItem>
                    <SelectItem value="maitre_salle">Maîtres de salle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={broadcastMutation.isPending}
              className="bg-brand-orange hover:bg-brand-orange-light text-white font-semibold">
              {broadcastMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Send className="size-4 mr-1.5" />}
              Envoyer
            </Button>
          </form>
        </div>

        {/* Historique */}
        {sent.length > 0 && (
          <div className="bg-brand-surface rounded-xl border border-brand-border max-w-2xl">
            <div className="px-5 py-4 border-b border-brand-border">
              <h3 className="text-white font-semibold">Broadcasts envoyés</h3>
            </div>
            <div className="divide-y divide-brand-border/50">
              {sent.map((n) => (
                <div key={n.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-white text-sm font-medium">{n.titre}</p>
                      <p className="text-brand-muted text-xs mt-0.5">{n.message}</p>
                    </div>
                    <span className="text-brand-muted text-xs shrink-0">{new Date(n.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <span className="mt-1 inline-flex px-2 py-0.5 rounded-full text-xs bg-white/5 text-brand-muted">{n.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
