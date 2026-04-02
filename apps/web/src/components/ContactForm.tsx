import { useState } from "react";
import { useAppState } from "../state/AppContext";

type Props = {
  assetId: string;
  assetTitle: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

export function ContactForm({ assetId, assetTitle }: Props) {
  const { selectedSlot, selectedDate, setBookingStep, createAnonymousBooking } =
    useAppState();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!selectedSlot) return null;

  const dateObj = new Date(selectedDate + "T00:00:00Z");
  const dayLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await createAnonymousBooking(assetId, {
      contactName: name,
      contactEmail: email,
      notes,
    });
    setSubmitting(false);
  };

  return (
    <div className="contact-form">
      <div className="contact-slot-summary">
        <div>
          <div className="contact-slot-label">Your booking</div>
          <div className="contact-slot-value">
            {dayLabel}, {formatTime(selectedSlot.startAt)} &ndash;{" "}
            {formatTime(selectedSlot.endAt)}
          </div>
        </div>
        <button
          className="contact-change-link"
          onClick={() => setBookingStep("calendar")}
        >
          Change
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="contact-field">
          <label className="input-label" htmlFor="booking-name">
            Your name
          </label>
          <input
            id="booking-name"
            className="input"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
          />
        </div>

        <div className="contact-field">
          <label className="input-label" htmlFor="booking-email">
            Your email
          </label>
          <input
            id="booking-email"
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="contact-field">
          <label className="input-label" htmlFor="booking-notes">
            Notes (optional)
          </label>
          <textarea
            id="booking-notes"
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tell the owner about your event or needs"
          />
        </div>

        <button
          className="btn-brand-lg"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Sending..." : "Request Booking \u2192"}
        </button>
      </form>

      <p className="contact-note">
        No account needed. The owner will confirm via your email.
      </p>
    </div>
  );
}
