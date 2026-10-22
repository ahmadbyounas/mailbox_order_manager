"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateOrderModal } from "@/components/CreateOrderModal";
import { OrderStatus, Provider, Role, User } from "@/types/domain";
import {
  RotateCw,
  Plus,
  Globe,
  Building2,
  Filter,
  CheckCircle2,
  Clock,
  AlertOctagon,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Inbox
} from "lucide-react";

interface OrderItem {
  id: string;
  domain: string;
  provider: Provider;
  mailboxCount: number;
  status: OrderStatus;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Admin filter states
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // 1. Fetch current user session
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

  // 2. Fetch orders
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "ALL") query.set("status", statusFilter);
      if (providerFilter !== "ALL") query.set("provider", providerFilter);
      query.set("page", String(page));
      query.set("limit", "10");

      const res = await fetch(`/api/orders?${query.toString()}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data.orders);
        setPagination(json.data.pagination);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, providerFilter, page]);

  useEffect(() => {
    if (currentUser) {
      loadOrders();
    }
  }, [currentUser, loadOrders]);

  // Live auto-refresh during pending or provisioning cycles
  useEffect(() => {
    const hasActiveJobs = orders.some(
      (o) => o.status === OrderStatus.PENDING || o.status === OrderStatus.PROVISIONING
    );
    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      loadOrders();
    }, 2500);
    return () => clearInterval(interval);
  }, [orders, loadOrders]);

  // Admin Retry Order
  const handleRetryOrder = async (orderId: string) => {
    setRetryingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || "Failed to retry order");
      } else {
        await loadOrders();
      }
    } catch {
      alert("Error retrying order");
    } finally {
      setRetryingId(null);
    }
  };

  const isAdmin = currentUser?.role === Role.ADMIN;

  // KPI calculations
  const totalCount = pagination.total || orders.length;
  const activeCount = orders.filter((o) => o.status === OrderStatus.ACTIVE).length;
  const provisioningCount = orders.filter((o) => o.status === OrderStatus.PROVISIONING || o.status === OrderStatus.PENDING).length;
  const failedCount = orders.filter((o) => o.status === OrderStatus.FAILED).length;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {currentUser && <Navbar currentUser={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {isAdmin ? "Admin Operations Command" : "Mailbox Provisioning Center"}
              </h1>
              <span
                className={`text-xs px-3 py-1 rounded-full font-semibold border shadow-sm ${
                  isAdmin
                    ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                    : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                }`}
              >
                {isAdmin ? "Global Tenant Overview" : "Client Dashboard"}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              {isAdmin
                ? "Live orchestrator: supervise multi-tenant order states, analyze worker provisioning telemetry, and trigger atomic retries on failed instances."
                : "Order pre-warmed Google Workspace and Microsoft 365 mailboxes for your email outreach domains with automated provisioning."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadOrders()}
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl bg-slate-900/90 border border-slate-700/60 hover:border-slate-600 transition flex items-center gap-2 shadow-sm"
              title="Refresh Orders"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Sync Status</span>
            </button>

            {!isAdmin && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all transform active:scale-95 border border-white/10"
              >
                <Plus className="w-4 h-4" />
                <span>New Mailbox Order</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Orders</span>
              <Layers className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2 tracking-tight">{totalCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Recorded in database</div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
          </div>

          <div className="glass-card p-5 rounded-2xl border-emerald-500/20 relative overflow-hidden group">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Active Mailboxes
              </span>
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2 tracking-tight">{activeCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">100% Provisioned & Warmed</div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          </div>

          <div className="glass-card p-5 rounded-2xl border-blue-500/20 relative overflow-hidden group">
            <div className="flex items-center justify-between text-blue-400 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400 animate-spin" />
                In Queue / Provisioning
              </span>
            </div>
            <div className="text-3xl font-extrabold text-blue-400 mt-2 tracking-tight">{provisioningCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Safe background worker lock</div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
          </div>

          <div className="glass-card p-5 rounded-2xl border-rose-500/20 relative overflow-hidden group">
            <div className="flex items-center justify-between text-rose-400 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                Failed (Retryable)
              </span>
            </div>
            <div className="text-3xl font-extrabold text-rose-400 mt-2 tracking-tight">{failedCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Admin retry permitted</div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-rose-500/10 transition-colors" />
          </div>
        </div>

        {/* Filter Controls for Admin */}
        {isAdmin && (
          <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-white/[0.08]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Filter className="w-4 h-4 text-purple-400" />
                <span>Filters:</span>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value={OrderStatus.PENDING}>Pending</option>
                  <option value={OrderStatus.PROVISIONING}>Provisioning</option>
                  <option value={OrderStatus.ACTIVE}>Active</option>
                  <option value={OrderStatus.FAILED}>Failed</option>
                </select>
              </div>

              <div>
                <select
                  value={providerFilter}
                  onChange={(e) => {
                    setProviderFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                >
                  <option value="ALL">All Providers</option>
                  <option value={Provider.GOOGLE}>Google Workspace</option>
                  <option value={Provider.MICROSOFT}>Microsoft 365</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Displaying {orders.length} of {pagination.total} orders
            </div>
          </div>
        )}

        {/* Orders Table Container */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">Order Details</th>
                  {isAdmin && <th scope="col" className="px-6 py-4 font-semibold">Tenant Customer</th>}
                  <th scope="col" className="px-6 py-4 font-semibold">Cloud Provider</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Quantity</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Lifecycle State</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Created Timestamp</th>
                  <th scope="col" className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="text-center py-16 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Clock className="w-6 h-6 animate-spin text-blue-500" />
                        <span className="text-xs font-medium">Synchronizing order registry...</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="text-center py-16">
                      <div className="max-w-sm mx-auto flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 mb-3 text-slate-400">
                          <Inbox className="w-6 h-6" />
                        </div>
                        <div className="text-white font-semibold text-base">No Orders Found</div>
                        <p className="text-xs text-slate-400 mt-1 mb-4">
                          {isAdmin
                            ? "No customer orders currently match your filter criteria."
                            : "You haven't provisioned any mailbox batches yet. Submit an order to start."}
                        </p>
                        {!isAdmin && (
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition"
                          >
                            Create First Order
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-white/[0.02] transition-colors duration-150 group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-mono text-xs">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm group-hover:text-blue-400 transition-colors">
                              {o.domain}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">
                              ID: {o.id.substring(0, 10)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold text-white">{o.user?.name || "Customer"}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{o.user?.email}</div>
                        </td>
                      )}

                      <td className="px-6 py-4">
                        {o.provider === Provider.GOOGLE ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20">
                            <span className="w-2 h-2 rounded-full bg-red-400" />
                            Google Workspace
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            Microsoft 365
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 border border-slate-700/60 text-slate-200">
                          {o.mailboxCount} inboxes
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={o.status} />
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                        {new Date(o.createdAt).toLocaleDateString()} {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        {isAdmin && o.status === OrderStatus.FAILED && (
                          <button
                            onClick={() => handleRetryOrder(o.id)}
                            disabled={retryingId === o.id}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm transition disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <RotateCw className={`w-3 h-3 ${retryingId === o.id ? "animate-spin" : ""}`} />
                            <span>{retryingId === o.id ? "Retrying..." : "Retry"}</span>
                          </button>
                        )}
                        <Link
                          href={`/orders/${o.id}`}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-blue-300 border border-slate-700/80 transition inline-flex items-center gap-1 shadow-sm"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-950/60 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              <div>
                Page <span className="text-white font-medium">{pagination.page}</span> of {pagination.totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 disabled:opacity-30 hover:text-white transition"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 disabled:opacity-30 hover:text-white transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <CreateOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onOrderCreated={() => loadOrders()}
      />
    </div>
  );
}
