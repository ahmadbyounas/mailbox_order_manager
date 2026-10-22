"use client";

import React, { useState } from "react";
import { Provider } from "@/types/domain";
import { Globe, Building2, Key, RefreshCw, X, Mail, ShieldCheck, Check } from "lucide-react";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

export function CreateOrderModal({ isOpen, onClose, onOrderCreated }: CreateOrderModalProps) {
  const [domain, setDomain] = useState("");
  const [provider, setProvider] = useState<Provider>(Provider.GOOGLE);
  const [mailboxCount, setMailboxCount] = useState<number>(5);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    () => `key-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateNewKey = () => {
    setIdempotencyKey(`key-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    setError(null);
    setSuccessInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain.trim(),
          provider,
          mailboxCount: Number(mailboxCount),
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create order");
      }

      setSuccessInfo(`Order successfully submitted! (ID: ${data.data.id})`);
      setTimeout(() => {
        onOrderCreated();
        onClose();
      }, 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated w-full max-w-lg rounded-3xl p-6 shadow-2xl relative border border-white/10 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Provision Mailbox Fleet</h2>
              <p className="text-xs text-slate-400">Google Workspace & Microsoft 365 inboxes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {successInfo && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successInfo}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Domain */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Outreach Domain</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. outreach-sales.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Apex domain or subdomain (e.g. sender.company.com).</p>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Cloud Provider</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider(Provider.GOOGLE)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  provider === Provider.GOOGLE
                    ? "bg-red-500/10 border-red-500/40 ring-1 ring-red-500/40 shadow-lg shadow-red-500/5"
                    : "bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-400"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0 mt-0.5">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Google Workspace</div>
                  <div className="text-[11px] text-slate-400">Gmail pre-warmed pool</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider(Provider.MICROSOFT)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  provider === Provider.MICROSOFT
                    ? "bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/5"
                    : "bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-400"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Microsoft 365</div>
                  <div className="text-[11px] text-slate-400">Exchange Online pool</div>
                </div>
              </button>
            </div>
          </div>

          {/* Mailbox Count Slider */}
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-300">Mailbox Fleet Size</label>
              <span className="text-sm font-extrabold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                {mailboxCount} inboxes
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={mailboxCount}
              onChange={(e) => setMailboxCount(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>1</span>
              <span>25</span>
              <span>50 max</span>
            </div>
          </div>

          {/* Idempotency Key Section */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span>Idempotency Key (Safe Re-execution)</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateNewKey}
                className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Generate</span>
              </button>
            </div>
            <input
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
              <span>Guarantees exactly-once order creation under duplicate network calls.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2 border border-white/10"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching Order...</span>
                </>
              ) : (
                <span>Confirm & Provision</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
