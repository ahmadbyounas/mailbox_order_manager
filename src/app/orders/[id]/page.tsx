"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderStatus, Provider, Role, User, MailboxStatus } from "@/types/domain";

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

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {currentUser && <Navbar currentUser={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <a href="/" className="hover:text-white transition">
              ← Back to Dashboard
            </a>
            <span>/</span>
            <span className="text-gray-200 font-mono">Order {id.substring(0, 8)}...</span>
          </div>

          <button
            onClick={() => loadOrderDetail()}
            className="p-2 text-xs rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white transition"
          >
            🔄 Refresh Status
          </button>
        </div>

        {error ? (
          <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800 text-red-200">
            <h3 className="text-lg font-bold mb-1">Unable to Load Order</h3>
            <p className="text-sm">{error}</p>
          </div>
        ) : isLoading || !order ? (
          <div className="text-center py-20 text-gray-500">Loading order details...</div>
        ) : (
          <>
            {/* Order Overview Banner */}
            <div className="glass-panel rounded-2xl p-6 border border-gray-800 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800/80 pb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-bold text-white tracking-tight">{order.domain}</h1>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1 flex items-center space-x-4">
                    <span>Provider: <strong className="text-gray-200">{order.provider === Provider.GOOGLE ? "Google Workspace" : "Microsoft 365"}</strong></span>
                    <span>Customer: <strong className="text-gray-200">{order.user.name} ({order.user.email})</strong></span>
                    <span>Created: <strong className="text-gray-200">{new Date(order.createdAt).toLocaleString()}</strong></span>
                  </div>
                </div>

                {isAdmin && order.status === OrderStatus.FAILED && (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 disabled:opacity-50 transition"
                  >
                    {isRetrying ? "Triggering..." : "🔁 Retry Order Provisioning"}
                  </button>
                )}
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/80">
                  <div className="text-xs text-gray-400">Total Mailboxes</div>
                  <div className="text-lg font-bold text-white mt-0.5">{order.mailboxCount}</div>
                </div>
                <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/80">
                  <div className="text-xs text-gray-400">Active Mailboxes</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">
                    {order.mailboxes.filter((m) => m.status === MailboxStatus.ACTIVE).length}
                  </div>
                </div>
                <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/80">
                  <div className="text-xs text-gray-400">Failed Mailboxes</div>
                  <div className="text-lg font-bold text-red-400 mt-0.5">
                    {order.mailboxes.filter((m) => m.status === MailboxStatus.FAILED).length}
                  </div>
                </div>
                <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/80">
                  <div className="text-xs text-gray-400">Idempotency Key</div>
                  <div className="text-xs font-mono text-gray-300 mt-1 truncate" title={order.idempotencyKey || "None"}>
                    {order.idempotencyKey || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Per-Mailbox Status Table */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800 shadow-xl space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Mailbox Provisioning Status</h2>
                  <p className="text-xs text-gray-400">Individual status and external provider IDs for each requested inbox.</p>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {order.mailboxes.length} Mailbox Record(s)
                </span>
              </div>

              <div className="overflow-x-auto border border-gray-800/80 rounded-xl">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-900/90 text-xs uppercase text-gray-400 border-b border-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3">Email Address</th>
                      <th scope="col" className="px-6 py-3">Status</th>
                      <th scope="col" className="px-6 py-3">External Provider ID</th>
                      <th scope="col" className="px-6 py-3">Error / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {order.mailboxes.map((mb) => (
                      <tr key={mb.id} className="hover:bg-gray-900/40 transition">
                        <td className="px-6 py-3.5 font-mono text-xs text-white">
                          {mb.email}
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={mb.status} />
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs text-gray-400">
                          {mb.externalId || "—"}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-red-400 max-w-xs truncate" title={mb.errorMessage || ""}>
                          {mb.errorMessage || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Log Timeline */}
            <div className="glass-panel rounded-2xl p-6 border border-gray-800 shadow-xl space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Audit Log & State Transitions</h2>
                <p className="text-xs text-gray-400">Immutable chronological record of every status transition.</p>
              </div>

              <div className="space-y-4 pt-2">
                {order.auditLogs.map((log, index) => (
                  <div key={log.id} className="flex space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-950" />
                      {index < order.auditLogs.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-800 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex flex-wrap items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white">
                            {log.fromStatus ? `${log.fromStatus} → ` : "Created → "}
                            <span className="text-blue-400">{log.toStatus}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-gray-800 text-[10px] text-gray-300 font-mono">
                            {log.triggerSource}
                          </span>
                        </div>
                        <div>
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {log.changedBy && (
                        <div className="text-[11px] text-gray-400 mt-1">
                          Triggered by: {log.changedBy.name} ({log.changedBy.role}) - {log.changedBy.email}
                        </div>
                      )}

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <pre className="mt-2 p-2.5 rounded-lg bg-black/40 border border-gray-800 text-[11px] font-mono text-gray-300 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
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
