import { jsx as _jsx } from "react/jsx-runtime";
const STATUS_STYLES = {
    pending: { bg: "var(--brand-light)", color: "var(--brand)", label: "Pending" },
    confirmed: { bg: "var(--success-light)", color: "var(--success)", label: "Confirmed" },
    rejected: { bg: "var(--danger-light)", color: "var(--danger)", label: "Rejected" },
    cancelled: { bg: "var(--neutral-bg)", color: "var(--text-muted)", label: "Cancelled" },
    completed: { bg: "var(--neutral-bg)", color: "var(--text-muted)", label: "Completed" },
};
export function StatusPill({ status }) {
    const style = STATUS_STYLES[status];
    return (_jsx("span", { className: "status-pill", style: { background: style.bg, color: style.color }, children: style.label }));
}
