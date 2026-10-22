"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { User, Role } from "@/types/domain";
import { Mail, Activity, Shield, User as UserIcon, Users } from "lucide-react";

export function Navbar({ currentUser }: { currentUser: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    fetch("/api/auth/switch-user")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUsers(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleUserChange = async (newUserId: string) => {
    setSelectedUserId(newUserId);
    setIsSwitching(true);
    try {
      await fetch("/api/auth/switch-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newUserId }),
      });
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch user:", err);
      setIsSwitching(false);
    }
  };

  return (
    <header className="border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 shadow-2xl shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3.5 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
              <div className="h-full w-full bg-slate-950/80 backdrop-blur-sm rounded-[11px] flex items-center justify-center">
                <Mail className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg text-white tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Mailbox Provisioner
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold tracking-wide">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Pre-Warmed Multi-Tenant Cloud Mailboxes</p>
            </div>
          </Link>
        </div>

        {/* User / Role Switcher & Live Engine Status */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              Worker Online
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-900/90 border border-slate-700/60 rounded-xl p-1.5 shadow-inner">
            <div className="flex items-center pl-1.5 text-slate-400 gap-1 text-[11px]">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline font-medium">Switch Role:</span>
            </div>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserChange(e.target.value)}
              disabled={isSwitching}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer font-medium"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex items-center space-x-2.5">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white flex items-center justify-end gap-1">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">{currentUser.email}</div>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-sm ${
                currentUser.role === Role.ADMIN
                  ? "bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-purple-500/10"
                  : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-cyan-500/10"
              }`}
            >
              {currentUser.role === Role.ADMIN ? (
                <Shield className="w-3 h-3 text-purple-400" />
              ) : (
                <UserIcon className="w-3 h-3 text-cyan-400" />
              )}
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
