import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-white focus:ring-primary",
        secondary: "border-transparent bg-secondary text-gray-900 dark:text-gray-100 focus:ring-secondary",
        outline: "border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-300 focus:ring-gray-500",
        neutral: "border-transparent bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:ring-gray-300",
        success: "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 focus:ring-emerald-400",
        warning: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400 focus:ring-amber-400",
        destructive: "border-transparent bg-red-500/15 text-red-600 dark:text-red-400 focus:ring-red-400",
        // ステータスバリアント
        scheduled: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        working: "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        finished: "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        absent: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        pending: "border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        approved: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        rejected: "border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        completed: "border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        cancelled: "border-transparent bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-xs",
        xs: "px-1.5 py-0.5 text-[10px]",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

// ステータス文字列からラベルとバリアントを取得するヘルパー
const STATUS_LABELS: Record<string, string> = {
  scheduled: "予定",
  working: "出勤中",
  finished: "完了",
  absent: "欠勤",
  forgot_clockout: "退勤忘れ",
  pending: "申請中",
  approved: "承認済み",
  rejected: "却下",
  completed: "完了",
  cancelled: "キャンセル",
};

type StatusVariant = "scheduled" | "working" | "finished" | "absent" | "pending" | "approved" | "rejected" | "completed" | "cancelled" | "warning";

const STATUS_VARIANT_MAP: Record<string, StatusVariant> = {
  scheduled: "scheduled",
  working: "working",
  finished: "finished",
  absent: "absent",
  forgot_clockout: "warning",
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  completed: "completed",
  cancelled: "cancelled",
};

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: string;
  label?: string;
}

function StatusBadge({ status, label, size = "sm", className, ...props }: StatusBadgeProps) {
  const variant = STATUS_VARIANT_MAP[status] ?? "neutral";
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;

  return (
    <Badge variant={variant} size={size} className={className} {...props}>
      {displayLabel}
    </Badge>
  );
}

export { Badge, StatusBadge, badgeVariants, STATUS_LABELS };
