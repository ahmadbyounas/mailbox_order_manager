"use client";

import React, { useState } from "react";
import { Provider } from "@/types/domain";

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
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-gray-700 relative animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center pb-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white">Create Mailbox Order</h2>
            <p className="text-xs text-gray-400">Order pre-warmed Google or Microsoft mailboxes</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-sm">
            {error}
          </div>
        )}

        {successInfo && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-sm">
            {successInfo}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Domain */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Domain Name</label>
            <input
              type="text"
              required
              placeholder="e.g. outreach-growth.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-gray-500 mt-1">Must be a valid domain without http/https protocol.</p>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">Mailbox Provider</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider(Provider.GOOGLE)}
                className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition ${
                  provider === Provider.GOOGLE
                    ? "bg-blue-950/60 border-blue-500 ring-1 ring-blue-500"
                    : "bg-gray-900 border-gray-700 hover:border-gray-600 text-gray-400"
                }`}
              >
                <span className="text-2xl">🌐</span>
                <div>
                  <div className="text-sm font-semibold text-white">Google Workspace</div>
                  <div className="text-[11px] text-gray-400">Pre-warmed Gmail pool</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider(Provider.MICROSOFT)}
                className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition ${
                  provider === Provider.MICROSOFT
                    ? "bg-blue-950/60 border-blue-500 ring-1 ring-blue-500"
                    : "bg-gray-900 border-gray-700 hover:border-gray-600 text-gray-400"
                }`}
              >
                <span className="text-2xl">💼</span>
                <div>
                  <div className="text-sm font-semibold text-white">Microsoft 365</div>
                  <div className="text-[11px] text-gray-400">Exchange Online pool</div>
                </div>
              </button>
            </div>
          </div>

          {/* Mailbox Count Slider & Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-gray-300">Mailbox Count (1 to 50)</label>
              <span className="text-sm font-bold text-blue-400">{mailboxCount} mailboxes</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={mailboxCount}
              onChange={(e) => setMailboxCount(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
              <span>1</span>
              <span>25</span>
              <span>50 max</span>
            </div>
          </div>

          {/* Idempotency Key Section */}
          <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-medium text-gray-400">Idempotency Key (Prevents Duplicates)</span>
              <button
                type="button"
                onClick={handleGenerateNewKey}
                className="text-[11px] text-blue-400 hover:underline"
              >
                Regenerate
              </button>
            </div>
            <input
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="w-full bg-black/40 border border-gray-700 rounded px-2.5 py-1 text-xs text-gray-300 font-mono focus:outline-none"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Submitting multiple times with the same key safely returns the existing order without creating duplicates.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Creating Order...</span>
                </>
              ) : (
                <span>Confirm Order</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
