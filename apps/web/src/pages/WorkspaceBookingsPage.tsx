import { useState } from "react";
import { useAppState } from "../state/AppContext";
import { BookingCard } from "../components/BookingCard";
import type { BookingStatus } from "@scanya/shared";

const FILTERS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Rejected", value: "rejected" },
  { label: "Completed", value: "completed" },
];

export function WorkspaceBookingsPage() {
  const { ownerBookings, assets, updateBookingDecision } = useAppState();
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const filtered = filter === "all"
    ? ownerBookings
    : ownerBookings.filter((b) => b.status === filter);

  const getAssetTitle = (assetId: string) =>
    assets.find((a) => a.id === assetId)?.title ?? "Unknown asset";

  return (
    <div>
      <h1 className="section-title" style={{ fontSize: 22, marginBottom: 16 }}>Bookings</h1>
      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`filter-tab ${filter === f.value ? "filter-tab--active" : ""}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filtered.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          assetTitle={getAssetTitle(booking.assetId)}
          showActions={booking.status === "pending"}
          onConfirm={() => updateBookingDecision(booking.id, "confirm")}
          onReject={() => updateBookingDecision(booking.id, "reject")}
        />
      ))}
      {filtered.length === 0 && (
        <div className="empty-state">
          {filter === "all" ? "No bookings yet." : `No ${filter} bookings.`}
        </div>
      )}
    </div>
  );
}
