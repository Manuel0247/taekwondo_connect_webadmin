"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Building2, Users, Trophy, BookOpen, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/admin/TopBar";
import { StatsCard } from "@/components/admin/StatsCard";
import { ClubStatusBadge } from "@/components/admin/ClubStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const GRADE_COLORS = ["#E8650A", "#1B7A3F", "#2EA55A", "#F5A05C", "#8E8E93", "#3A3A3C", "#0A0A0A"];

interface DashboardData {
  total_users: number;
  total_clubs: number;
  total_events: number;
  total_courses: number;
}

interface Club {
  id: string;
  nom: string;
  ville: string;
  maitre_salle?: { nom: string; prenom: string };
  statut: "en_attente" | "valide" | "suspendu" | "refuse";
}

interface ActivityItem {
  mois: string;
  inscriptions: number;
}

interface GradeItem {
  grade: string;
  count: number;
}

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard");
      const d = res.data.data ?? {};
      // Normalize field names — API may use short or prefixed forms
      return {
        total_clubs:   d.total_clubs   ?? d.clubs   ?? 0,
        total_users:   d.total_users   ?? d.users   ?? d.athletes ?? 0,
        total_events:  d.total_events  ?? d.events  ?? 0,
        total_courses: d.total_courses ?? d.courses ?? 0,
      };
    },
  });

  const { data: pendingClubs, isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["pending-clubs"],
    queryFn: async () => {
      const res = await api.get("/clubs/pending");
      const d = res.data.data;
      return Array.isArray(d) ? d : (d?.clubs ?? d?.data ?? []);
    },
  });

  const { data: activityData } = useQuery<ActivityItem[]>({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard/activite");
      const d = res.data.data ?? {};
      // Try several possible keys
      return d.inscriptions_par_mois ?? d.activite ?? d.inscriptions ?? [];
    },
  });

  const { data: athleteStats } = useQuery<GradeItem[]>({
    queryKey: ["dashboard-athletes"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard/athletes");
      const d = res.data.data ?? {};
      return d.repartition_grades ?? d.grades ?? d.par_grade ?? [];
    },
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => api.put(`/admin/clubs/${id}/validate`),
    onSuccess: () => {
      toast.success("Club validé avec succès");
      queryClient.invalidateQueries({ queryKey: ["pending-clubs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: () => toast.error("Erreur lors de la validation"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      api.put(`/admin/clubs/${id}/reject`, { motif: "Dossier incomplet" }),
    onSuccess: () => {
      toast.success("Club refusé");
      queryClient.invalidateQueries({ queryKey: ["pending-clubs"] });
    },
    onError: () => toast.error("Erreur lors du refus"),
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[100px] rounded-xl bg-brand-surface" />
            ))
          ) : (
            <>
              <StatsCard title="Total Clubs" value={stats?.total_clubs ?? 0} icon={Building2} iconColor="text-brand-orange" />
              <StatsCard title="Total Athlètes" value={stats?.total_users ?? 0} icon={Users} iconColor="text-brand-green-light" />
              <StatsCard title="Événements" value={stats?.total_events ?? 0} icon={Trophy} iconColor="text-yellow-400" />
              <StatsCard title="Cours actifs" value={stats?.total_courses ?? 0} icon={BookOpen} iconColor="text-blue-400" />
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-brand-surface rounded-xl border border-brand-border p-5">
            <h3 className="text-white font-semibold mb-4">Inscriptions par mois</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityData ?? []}>
                <XAxis dataKey="mois" stroke="#8E8E93" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8E8E93" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1C1C1E", border: "1px solid #3A3A3C", borderRadius: 8 }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#E8650A" }}
                />
                <Bar dataKey="inscriptions" fill="#E8650A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-brand-surface rounded-xl border border-brand-border p-5">
            <h3 className="text-white font-semibold mb-4">Répartition des grades</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={athleteStats ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="count"
                  nameKey="grade"
                >
                  {(athleteStats ?? []).map((_, index) => (
                    <Cell key={index} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1C1C1E", border: "1px solid #3A3A3C", borderRadius: 8 }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#8E8E93" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Clubs */}
        <div className="bg-brand-surface rounded-xl border border-brand-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
            <h3 className="text-white font-semibold">Clubs en attente de validation</h3>
            {pendingClubs && pendingClubs.length > 0 && (
              <span className="bg-brand-orange/20 text-brand-orange text-xs font-medium px-2 py-0.5 rounded-full">
                {pendingClubs.length} en attente
              </span>
            )}
          </div>

          {clubsLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />
              ))}
            </div>
          ) : !pendingClubs?.length ? (
            <div className="flex items-center justify-center py-12 text-brand-muted text-sm">
              Aucun club en attente
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Club</th>
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Ville</th>
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Maître</th>
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Statut</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pendingClubs.map((club) => (
                    <tr key={club.id} className="border-b border-brand-border/50 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 text-white text-sm font-medium">{club.nom}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{club.ville}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm">
                        {club.maitre_salle ? `${club.maitre_salle.prenom} ${club.maitre_salle.nom}` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <ClubStatusBadge status={club.statut} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => validateMutation.mutate(club.id)}
                            disabled={validateMutation.isPending}
                            className="bg-brand-green hover:bg-brand-green-light text-white h-7 px-3 text-xs"
                          >
                            {validateMutation.isPending ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <><CheckCircle2 className="size-3 mr-1" />Valider</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMutation.mutate(club.id)}
                            disabled={rejectMutation.isPending}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-7 px-3 text-xs"
                          >
                            <XCircle className="size-3 mr-1" />Refuser
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
