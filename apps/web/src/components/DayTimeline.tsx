import { useAppState } from "../state/AppContext";
import type { AvailabilityWindow, Booking } from "@scanya/shared";

type Props = {
  assetId: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function getHours(startAt: string, endAt: string) {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  return Math.round(ms / 3_600_000);
}

type SlotInfo = {
  startAt: string;
  endAt: string;
  status: "available" | "selected" | "booked";
};

function buildSlots(
  windows: AvailabilityWindow[],
  bookings: Booking[],
  selectedSlot: { startAt: string; endAt: string } | null,
): SlotInfo[] {
  return windows.map((w) => {
    const isBooked = bookings.some(
      (b) =>
        ["pending", "confirmed"].includes(b.status) &&
        new Date(b.startAt) <= new Date(w.startAt) &&
        new Date(b.endAt) >= new Date(w.endAt),
    );

    const isSelected =
      selectedSlot?.startAt === w.startAt && selectedSlot?.endAt === w.endAt;

    return {
      startAt: w.startAt,
      endAt: w.endAt,
      status: isSelected ? "selected" : isBooked ? "booked" : "available",
    };
  });
}

export function DayTimeline({ assetId }: Props) {
  const {
    selectedDate,
    availability,
    selectedSlot,
    selectSlot,
    setCalendarView,
    setBookingStep,
  } = useAppState();

  const dateObj = new Date(selectedDate + "T00:00:00Z");
  const dayLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  const slots = availability
    ? buildSlots(availability.windows, availability.bookings, selectedSlot)
    : [];

  const availableCount = slots.filter((s) => s.status !== "booked").length;

  const handleSelect = (slot: SlotInfo) => {
    if (slot.status === "booked") return;
    if (slot.status === "selected") {
      selectSlot(null);
    } else {
      selectSlot({ startAt: slot.startAt, endAt: slot.endAt });
    }
  };

  const handleContinue = () => {
    setBookingStep("contact");
  };

  return (
    <div className="day-timeline">
      <div className="day-timeline-header">
        <button
          className="day-back-btn"
          onClick={() => setCalendarView("month")}
          aria-label="Back to month"
        >
          &larr;
        </button>
        <div>
          <div className="day-timeline-title">{dayLabel}</div>
          <div className="day-timeline-subtitle">
            {slots.length} slots &bull; {availableCount} available
          </div>
        </div>
      </div>

      <div className="day-slots">
        {slots.map((slot) => (
          <div key={slot.startAt} className="day-slot-row">
            <div className="day-slot-times">
              <div className="day-slot-start">{formatTime(slot.startAt)}</div>
              <div className="day-slot-end">{formatTime(slot.endAt)}</div>
            </div>
            <div className={`day-slot-bar day-slot-bar--${slot.status}`} />
            <button
              className={`day-slot-card day-slot-card--${slot.status}`}
              onClick={() => handleSelect(slot)}
              disabled={slot.status === "booked"}
            >
              <div>
                <div className="day-slot-label">
                  {slot.status === "available" && "Available"}
                  {slot.status === "selected" && "Selected \u2713"}
                  {slot.status === "booked" && "Booked"}
                </div>
                <div className="day-slot-duration">
                  {getHours(slot.startAt, slot.endAt)} hours
                </div>
              </div>
              <div className="day-slot-action">
                {slot.status === "available" && "Select"}
                {slot.status === "selected" && "Change"}
                {slot.status === "booked" && "Unavailable"}
              </div>
            </button>
          </div>
        ))}

        {slots.length === 0 && (
          <p className="day-empty">No availability slots for this day.</p>
        )}
      </div>

      {selectedSlot && (
        <div className="day-summary">
          <div>
            <div className="day-summary-label">Your booking</div>
            <div className="day-summary-value">
              {dayLabel}, {formatTime(selectedSlot.startAt)} &ndash;{" "}
              {formatTime(selectedSlot.endAt)}
            </div>
            <div className="day-summary-duration">
              {getHours(selectedSlot.startAt, selectedSlot.endAt)} hours
            </div>
          </div>
          <button className="btn-brand" onClick={handleContinue}>
            Continue &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
