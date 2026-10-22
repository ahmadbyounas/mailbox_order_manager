"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateOrderModal } from "@/components/CreateOrderModal";
import { OrderStatus, Provider, Role, User } from "@/types/domain";

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
          // Read cookie or take first
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {currentUser && <Navbar currentUser={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
              <span>{isAdmin ? "Admin Overview" : "Customer Portal"}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700">
                {isAdmin ? "Global View (All Orders)" : "My Orders"}
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {isAdmin
                ? "Monitor mailbox provisioning across all tenants, filter by status, and retry failed batches."
                : "Manage pre-warmed Google and Microsoft mailbox orders for your outreach domains."}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadOrders()}
              className="p-2 text-gray-400 hover:text-white rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 transition"
              title="Refresh Orders"
            >
              🔄 Refresh
            </button>

            {!isAdmin && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 flex items-center space-x-2 transition"
              >
                <span>➕</span>
                <span>Create Order</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls for Admin */}
        {isAdmin && (
          <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value={OrderStatus.PENDING}>Pending</option>
                  <option value={OrderStatus.PROVISIONING}>Provisioning</option>
                  <option value={OrderStatus.ACTIVE}>Active</option>
                  <option value={OrderStatus.FAILED}>Failed</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Provider Filter</label>
                <select
                  value={providerFilter}
                  onChange={(e) => {
                    setProviderFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
                >
                  <option value="ALL">All Providers</option>
                  <option value={Provider.GOOGLE}>Google Workspace</option>
                  <option value={Provider.MICROSOFT}>Microsoft 365</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-gray-400">
              Showing {orders.length} of {pagination.total} total orders
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-900/90 text-xs uppercase text-gray-400 border-b border-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Order ID</th>
                  {isAdmin && <th scope="col" className="px-6 py-3.5">Customer</th>}
                  <th scope="col" className="px-6 py-3.5">Domain</th>
                  <th scope="col" className="px-6 py-3.5">Provider</th>
                  <th scope="col" className="px-6 py-3.5">Count</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5">Created</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-gray-500">
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="text-center py-12">
                      <div className="text-gray-400 font-medium">No orders found.</div>
                      {!isAdmin && (
                        <p className="text-xs text-gray-500 mt-1">
                          Click &quot;Create Order&quot; above to submit your first domain batch.
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-900/50 transition">
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">
                        {o.id.substring(0, 8)}...
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold text-white">{o.user?.name || "Customer"}</div>
                          <div className="text-[11px] text-gray-400">{o.user?.email}</div>
                        </td>
                      )}
                      <td className="px-6 py-4 font-medium text-white">
                        {o.domain}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center text-xs text-gray-300">
                          {o.provider === Provider.GOOGLE ? "🌐 Google" : "💼 Microsoft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-300">
                        {o.mailboxCount} mailboxes
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(o.createdAt).toLocaleDateString()} {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isAdmin && o.status === OrderStatus.FAILED && (
                          <button
                            onClick={() => handleRetryOrder(o.id)}
                            disabled={retryingId === o.id}
                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-600 hover:bg-amber-500 text-white shadow transition disabled:opacity-50"
                          >
                            {retryingId === o.id ? "Retrying..." : "🔁 Retry"}
                          </button>
                        )}
                        <a
                          href={`/orders/${o.id}`}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-gray-800 hover:bg-gray-700 text-blue-400 border border-gray-700 hover:border-gray-600 transition"
                        >
                          View Details →
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-3.5 bg-gray-900/60 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <div>
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40 hover:text-white"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="px-3 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40 hover:text-white"
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
