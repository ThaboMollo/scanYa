import type { BookingStatus } from "@scanya/shared";

const STATUS_STYLES: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  pending: { bg: "var(--brand-light)", color: "var(--brand)", label: "Pending" },
  confirmed: { bg: "var(--success-light)", color: "var(--success)", label: "Confirmed" },
  rejected: { bg: "var(--danger-light)", color: "var(--danger)", label: "Rejected" },
  cancelled: { bg: "var(--neutral-bg)", color: "var(--text-muted)", label: "Cancelled" },
  completed: { bg: "var(--neutral-bg)", color: "var(--text-muted)", label: "Completed" },
};

export function StatusPill({ status }: { status: BookingStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className="status-pill" style={{ background: style.bg, color: style.color }}>
      {style.label}
    </span>
  );
}
