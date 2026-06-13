"use client";

import { Bell, ChevronDown } from "lucide-react";
import { getUser } from "@/lib/auth";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

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
    <header className="h-14 border-b border-brand-border bg-brand-black flex items-center justify-between px-6 shrink-0">
      <h1 className="text-white font-semibold text-base">{title}</h1>

      <div className="flex items-center gap-3">
        <button className="relative text-brand-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
          <Bell className="size-5" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-white hover:bg-white/5 px-3 py-1.5 rounded-lg transition-colors">
              <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center text-xs font-bold text-white">
                {user ? `${user.prenom[0]}${user.nom[0]}` : "A"}
              </div>
              <span className="font-medium">
                {user ? `${user.prenom} ${user.nom}` : "Admin"}
              </span>
              <ChevronDown className="size-3.5 text-brand-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-brand-surface border-brand-border text-white min-w-[160px]"
          >
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
            >
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
