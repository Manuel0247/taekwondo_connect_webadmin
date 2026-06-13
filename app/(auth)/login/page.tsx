"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { setAuth } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Email invalide"),
  mot_de_passe: z.string().min(1, "Mot de passe requis"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", data);
      const { user, token } = res.data.data;

      // The API may not return a `role` field directly — derive it from the response shape
      const role: string = user.role ?? (user.club ? "maitre_salle" : user.athlete ? "athlete" : "admin");

      if (role !== "admin") {
        toast.error("Accès réservé aux administrateurs");
        return;
      }

      setAuth(token, { ...user, role });
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Identifiants incorrects";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-black px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-brand-surface flex items-center justify-center mb-4 overflow-hidden">
            <Image
              src="/logo.png"
              alt="LCC Taekwondo"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">LCC Taekwondo</h1>
          <p className="text-brand-muted text-sm mt-1">Espace Administrateur</p>
        </div>

        <div className="bg-brand-surface rounded-2xl border border-brand-border p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Connexion</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ligue-taekwondo.com"
                className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted focus-visible:ring-brand-orange"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-xs">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mot_de_passe" className="text-white">
                Mot de passe
              </Label>
              <Input
                id="mot_de_passe"
                type="password"
                placeholder="••••••••"
                className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted focus-visible:ring-brand-orange"
                {...register("mot_de_passe")}
              />
              {errors.mot_de_passe && (
                <p className="text-red-500 text-xs">
                  {errors.mot_de_passe.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-orange hover:bg-brand-orange-light text-white font-semibold h-11"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-brand-muted text-xs mt-6">
          Ligue Communale de Cocody — Taekwondo
        </p>
      </div>
    </div>
  );
}
