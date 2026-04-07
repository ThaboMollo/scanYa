import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StatusPill } from "./StatusPill";
function getInitials(name) {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
function getAvatarColor(name) {
    const colors = [
        { bg: "#FFF0E8", color: "#E8734A" },
        { bg: "#E8F0FF", color: "#4A6FE8" },
        { bg: "#F5EEF8", color: "#8E4AB5" },
        { bg: "#E8F5EE", color: "#2D7A4F" },
        { bg: "#FFF5E0", color: "#C4870A" },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}
function formatDateTime(iso) {
    return new Date(iso).toLocaleDateString("en-US", {
        weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
    });
}
function formatTime(iso) {
    return new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
    });
}
export function BookingCard({ booking, assetTitle, showActions = false, onConfirm, onReject }) {
    const avatar = getAvatarColor(booking.contactName);
    const initials = getInitials(booking.contactName);
    return (_jsxs("div", { className: "booking-card", children: [_jsxs("div", { className: "booking-card-main", children: [_jsxs("div", { className: "booking-card-requester", children: [_jsx("div", { className: "booking-card-avatar", style: { background: avatar.bg, color: avatar.color }, children: initials }), _jsxs("div", { children: [_jsx("div", { className: "booking-card-name", children: booking.contactName }), _jsx("div", { className: "booking-card-email", children: booking.contactEmail })] })] }), _jsxs("div", { className: "booking-card-details", children: [assetTitle && (_jsxs("div", { className: "booking-card-detail", children: [_jsx("strong", { children: "Asset:" }), " ", assetTitle] })), _jsxs("div", { className: "booking-card-detail", children: [_jsx("strong", { children: "When:" }), " ", formatDateTime(booking.startAt), ",", " ", formatTime(booking.startAt), " \u2013 ", formatTime(booking.endAt)] })] }), booking.notes && _jsx("div", { className: "booking-card-notes", children: booking.notes }), booking.status !== "pending" && _jsx(StatusPill, { status: booking.status })] }), showActions && booking.status === "pending" && (_jsxs("div", { className: "booking-card-actions", children: [_jsx("button", { className: "btn btn-success", onClick: onConfirm, children: "Confirm" }), _jsx("button", { className: "btn btn-danger-outline", onClick: onReject, children: "Reject" })] }))] }));
}
