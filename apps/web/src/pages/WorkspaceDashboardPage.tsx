import { Link } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import { StatCard } from "../components/StatCard";
import { BookingCard } from "../components/BookingCard";

export function WorkspaceDashboardPage() {
  const { session, assets, ownerBookings, updateBookingDecision } = useAppState();

  const publishedCount = assets.filter(
    (a) => a.ownerId === session?.user.id && a.status === "published",
  ).length;

  const pendingBookings = ownerBookings.filter((b) => b.status === "pending");
  const confirmedThisMonth = ownerBookings.filter((b) => {
    if (b.status !== "confirmed") return false;
    const bookingMonth = b.createdAt.slice(0, 7);
    const currentMonth = new Date().toISOString().slice(0, 7);
    return bookingMonth === currentMonth;
  }).length;

  const getAssetTitle = (assetId: string) =>
    assets.find((a) => a.id === assetId)?.title ?? "Unknown asset";

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">
            Good morning, {session?.user.name.split(" ")[0]}
          </h1>
          <p className="dashboard-subtitle">
            {pendingBookings.length > 0
              ? `You have ${pendingBookings.length} pending booking request${pendingBookings.length > 1 ? "s" : ""}`
              : "No pending requests"}
          </p>
        </div>
        <Link to="/app/assets" className="btn btn-brand">+ New Asset</Link>
      </div>

      <div className="stats-row">
        <StatCard label="Published Assets" value={publishedCount} />
        <StatCard label="Pending Requests" value={pendingBookings.length} variant="brand" />
        <StatCard label="Confirmed This Month" value={confirmedThisMonth} variant="success" />
      </div>

      {pendingBookings.length > 0 && (
        <div>
          <h2 className="section-title">Pending Requests</h2>
          <p className="section-subtitle">These people want to rent your assets</p>
          {pendingBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              assetTitle={getAssetTitle(booking.assetId)}
              showActions
              onConfirm={() => updateBookingDecision(booking.id, "confirm")}
              onReject={() => updateBookingDecision(booking.id, "reject")}
            />
          ))}
        </div>
      )}

      {pendingBookings.length === 0 && (
        <div className="empty-state">All caught up! No pending booking requests.</div>
      )}
    </div>
  );
}
