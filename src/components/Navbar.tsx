"use client";

import React, { useState, useEffect } from "react";
import Link from "next/navigation";
import { User, Role } from "@/types/domain";

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
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <a href="/" className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              ✉️
            </div>
            <div>
              <span className="font-semibold text-lg text-white tracking-tight">Mailbox Order Manager</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                Internal Ops
              </span>
            </div>
          </a>

          <nav className="hidden md:flex space-x-1">
            <a
              href="/"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition"
            >
              Dashboard
            </a>
          </nav>
        </div>

        {/* User / Role Switcher */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>Simulate User:</span>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserChange(e.target.value)}
              disabled={isSwitching}
              className="bg-gray-900 border border-gray-700 rounded-md px-2.5 py-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role}) - {u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-gray-800" />

          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-xs font-medium text-white">{currentUser.name}</div>
              <div className="text-[10px] text-gray-400">{currentUser.email}</div>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                currentUser.role === Role.ADMIN
                  ? "bg-purple-950 text-purple-300 border border-purple-800"
                  : "bg-emerald-950 text-emerald-300 border border-emerald-800"
              }`}
            >
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
