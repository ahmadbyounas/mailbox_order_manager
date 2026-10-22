"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderStatus, Provider, Role, User, MailboxStatus } from "@/types/domain";
import {
  ArrowLeft,
  RotateCw,
  Globe,
  Building2,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  FileCode,
  User as UserIcon,
  Shield,
  Layers,
  Key
} from "lucide-react";

interface MailboxItem {
  id: string;
  email: string;
  status: MailboxStatus;
  externalId?: string | null;
  errorMessage?: string | null;
  updatedAt: string;
}

interface AuditLogItem {
  id: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  triggerSource: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  changedBy?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

interface OrderDetail {
  id: string;
  domain: string;
  provider: Provider;
  mailboxCount: number;
  status: OrderStatus;
  idempotencyKey?: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  mailboxes: MailboxItem[];
  auditLogs: AuditLogItem[];
}

export default function OrderDetailPage() {
  const urlParams = useParams();
  const id = typeof urlParams.id === "string" ? urlParams.id : Array.isArray(urlParams.id) ? urlParams.id[0] : "";

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Fetch session user
  useEffect(() => {
    fetch("/api/auth/switch-user")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          const cookieMatch = document.cookie.match(/mailbox_active_user_id=([^;]+)/);
          const activeId = cookieMatch ? cookieMatch[1] : data.data[0].id;
          const found = data.data.find((u: User) => u.id === activeId) || data.data[0];
          setCurrentUser(found);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch order detail
  const loadOrderDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Order not found");
      }
      setOrder(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading order");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (currentUser) {
      loadOrderDetail();
    }
  }, [currentUser, loadOrderDetail]);

  // Real-time polling while provisioning
  useEffect(() => {
    if (!order) return;
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROVISIONING) return;

    const interval = setInterval(() => {
      loadOrderDetail();
    }, 2000);
    return () => clearInterval(interval);
  }, [order, loadOrderDetail]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/orders/${id}/retry`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || "Retry failed");
      } else {
        await loadOrderDetail();
      }
    } catch {
      alert("Error triggering retry");
    } finally {
      setIsRetrying(false);
    }
  };

  const isAdmin = currentUser?.role === Role.ADMIN;
  const activeCount = order ? order.mailboxes.filter((m) => m.status === MailboxStatus.ACTIVE).length : 0;
  const failedCount = order ? order.mailboxes.filter((m) => m.status === MailboxStatus.FAILED).length : 0;
  const progressPercent = order && order.mailboxCount > 0 ? Math.round((activeCount / order.mailboxCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {currentUser && <Navbar currentUser={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex items-center justify-between pb-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition group bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Back to Dashboard</span>
          </Link>

          <button
            onClick={() => loadOrderDetail()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Sync Order</span>
          </button>
        </div>

        {error ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Unable to Load Order
            </h3>
            <p className="text-xs text-rose-300">{error}</p>
          </div>
        ) : isLoading || !order ? (
          <div className="text-center py-24 text-slate-500 flex flex-col items-center justify-center gap-3">
            <Clock className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-medium">Fetching order telemetry...</span>
          </div>
        ) : (
          <>
            {/* Order Overview Banner */}
            <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-white/[0.08] pb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{order.domain}</h1>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="text-xs text-slate-400 mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <span className="flex items-center gap-1.5">
                      {order.provider === Provider.GOOGLE ? (
                        <Globe className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span>Provider: <strong className="text-slate-200 font-semibold">{order.provider === Provider.GOOGLE ? "Google Workspace" : "Microsoft 365"}</strong></span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>Tenant: <strong className="text-slate-200 font-semibold">{order.user.name} ({order.user.email})</strong></span>
                    </span>

                    <span className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(order.createdAt).toLocaleString()}</span>
                    </span>
                  </div>
                </div>

                {isAdmin && order.status === OrderStatus.FAILED && (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10 disabled:opacity-50 transition flex items-center gap-2 self-start lg:self-auto"
                  >
                    <RotateCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
                    <span>{isRetrying ? "Triggering..." : "Retry Failed Order"}</span>
                  </button>
                )}
              </div>

              {/* Progress Bar & KPI metrics */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    Provisioning Completion
                  </span>
                  <span className="font-mono text-xs font-bold text-white">
                    {activeCount} of {order.mailboxCount} Mailboxes ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/[0.05]">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="glass-card p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-400">Total Requested</div>
                    <div className="text-xl font-extrabold text-white mt-1">{order.mailboxCount}</div>
                  </div>
                  <div className="glass-card p-3.5 rounded-2xl border-emerald-500/20">
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Active
                    </div>
                    <div className="text-xl font-extrabold text-emerald-400 mt-1">{activeCount}</div>
                  </div>
                  <div className="glass-card p-3.5 rounded-2xl border-rose-500/20">
                    <div className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      Failed
                    </div>
                    <div className="text-xl font-extrabold text-rose-400 mt-1">{failedCount}</div>
                  </div>
                  <div className="glass-card p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Key className="w-3 h-3 text-blue-400" />
                      Idempotency Key
                    </div>
                    <div className="text-xs font-mono text-slate-300 mt-1 truncate" title={order.idempotencyKey || "N/A"}>
                      {order.idempotencyKey || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-Mailbox Status Table */}
            <div className="glass-panel rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-400" />
                    Mailbox Provisioning Registry
                  </h2>
                  <p className="text-xs text-slate-400">External provider ID mapping and error logs per inbox account.</p>
                </div>
                <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                  {order.mailboxes.length} Accounts
                </span>
              </div>

              <div className="overflow-x-auto border border-white/[0.08] rounded-2xl">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Account Email</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Provisioning State</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Cloud External ID</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Diagnostic Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {order.mailboxes.map((mb) => (
                      <tr key={mb.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-6 py-3.5 font-mono text-xs font-semibold text-white flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{mb.email}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={mb.status} />
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-400">
                          {mb.externalId ? (
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                              {mb.externalId}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-rose-300 max-w-xs truncate" title={mb.errorMessage || ""}>
                          {mb.errorMessage || <span className="text-slate-600 font-mono">None (Healthy)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Log Timeline */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08] shadow-2xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  State Machine Audit Timeline
                </h2>
                <p className="text-xs text-slate-400">Cryptographically verifiable state transitions recorded at every lifecycle milestone.</p>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-indigo-500 before:to-slate-800">
                {order.auditLogs.map((log) => (
                  <div key={log.id} className="relative group">
                    <div className="absolute -left-[19px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-blue-500 ring-4 ring-blue-500/10 shadow-sm" />
                    
                    <div className="glass-card p-4 rounded-2xl space-y-2 border border-white/[0.07]">
                      <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {log.fromStatus ? `${log.fromStatus} ➔ ` : "ORDER_CREATED ➔ "}
                            <span className="text-blue-400">{log.toStatus}</span>
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-cyan-400 font-mono font-semibold">
                            {log.triggerSource}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {log.changedBy && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <UserIcon className="w-3 h-3 text-slate-500" />
                          <span>Initiated by: <strong className="text-slate-300">{log.changedBy.name}</strong> ({log.changedBy.role})</span>
                        </div>
                      )}

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 p-3 rounded-xl bg-slate-950/90 border border-slate-800/80">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1 flex items-center gap-1">
                            <FileCode className="w-3 h-3" />
                            <span>Payload Metadata</span>
                          </div>
                          <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
