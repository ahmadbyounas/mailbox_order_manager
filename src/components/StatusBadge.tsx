import React from "react";
import { OrderStatus, MailboxStatus } from "@/types/domain";
import { Clock, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export function StatusBadge({ status }: { status: OrderStatus | MailboxStatus }) {
  switch (status) {
    case OrderStatus.PENDING:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold badge-pending tracking-wide">
          <Clock className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
          <span>PENDING</span>
        </span>
      );
    case OrderStatus.PROVISIONING:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold badge-provisioning tracking-wide">
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          <span>PROVISIONING</span>
        </span>
      );
    case OrderStatus.ACTIVE:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold badge-active tracking-wide">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>ACTIVE</span>
        </span>
      );
    case OrderStatus.FAILED:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold badge-failed tracking-wide">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>FAILED</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
          {String(status)}
        </span>
      );
  }
}
