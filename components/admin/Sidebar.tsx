"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  Trophy,
  BookOpen,
  Award,
  BarChart3,
  Bell,
  UserCog,
  LogOut,
} from "lucide-react";
import { clearAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clubs", label: "Clubs", icon: Building2 },
  { href: "/athletes", label: "Athlètes", icon: Users },
  { href: "/events", label: "Événements", icon: Trophy },
  { href: "/techniques", label: "Techniques", icon: BookOpen },
  { href: "/badges", label: "Badges", icon: Award },
  { href: "/rankings", label: "Classements", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/users", label: "Utilisateurs", icon: UserCog },
];

interface SidebarProps {
  pendingClubs?: number;
}

export function Sidebar({ pendingClubs = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    clearAuth();
    router.push("/login");
  };

  return (
    <aside className="w-64 shrink-0 bg-brand-black border-r border-brand-border flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-brand-border">
        <div className="w-9 h-9 rounded-lg bg-brand-surface flex items-center justify-center overflow-hidden shrink-0">
          <Image
            src="/logo.png"
            alt="LCC"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">LCC Taekwondo</p>
          <p className="text-brand-muted text-xs mt-0.5">Administration</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group",
                isActive
                  ? "text-brand-orange bg-brand-orange/10 border-l-2 border-brand-orange pl-[10px]"
                  : "text-brand-muted hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {href === "/clubs" && pendingClubs > 0 && (
                <span className="bg-brand-orange text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                  {pendingClubs}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-brand-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut className="size-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
