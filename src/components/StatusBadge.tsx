import React from "react";
import { OrderStatus, MailboxStatus } from "@/types/domain";

export function StatusBadge({ status }: { status: OrderStatus | MailboxStatus }) {
  switch (status) {
    case OrderStatus.PENDING:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-pending">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1.5 animate-pulse" />
          PENDING
        </span>
      );
    case OrderStatus.PROVISIONING:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-provisioning">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-spin" />
          PROVISIONING
        </span>
      );
    case OrderStatus.ACTIVE:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-active">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5" />
          ACTIVE
        </span>
      );
    case OrderStatus.FAILED:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-failed">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5" />
          FAILED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
          {String(status)}
        </span>
      );
  }
}
