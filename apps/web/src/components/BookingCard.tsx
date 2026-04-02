import type { Booking } from "@scanya/shared";
import { StatusPill } from "./StatusPill";

type Props = {
  booking: Booking;
  assetTitle?: string;
  showActions?: boolean;
  onConfirm?: () => void;
  onReject?: () => void;
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
  });
}

export function BookingCard({ booking, assetTitle, showActions = false, onConfirm, onReject }: Props) {
  const avatar = getAvatarColor(booking.contactName);
  const initials = getInitials(booking.contactName);

  return (
    <div className="booking-card">
      <div className="booking-card-main">
        <div className="booking-card-requester">
          <div className="booking-card-avatar" style={{ background: avatar.bg, color: avatar.color }}>
            {initials}
          </div>
          <div>
            <div className="booking-card-name">{booking.contactName}</div>
            <div className="booking-card-email">{booking.contactEmail}</div>
          </div>
        </div>

        <div className="booking-card-details">
          {assetTitle && (
            <div className="booking-card-detail"><strong>Asset:</strong> {assetTitle}</div>
          )}
          <div className="booking-card-detail">
            <strong>When:</strong> {formatDateTime(booking.startAt)},{" "}
            {formatTime(booking.startAt)} &ndash; {formatTime(booking.endAt)}
          </div>
        </div>

        {booking.notes && <div className="booking-card-notes">{booking.notes}</div>}
        {booking.status !== "pending" && <StatusPill status={booking.status} />}
      </div>

      {showActions && booking.status === "pending" && (
        <div className="booking-card-actions">
          <button className="btn btn-success" onClick={onConfirm}>Confirm</button>
          <button className="btn btn-danger-outline" onClick={onReject}>Reject</button>
        </div>
      )}
    </div>
  );
}
