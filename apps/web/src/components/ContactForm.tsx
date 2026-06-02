import { useEffect, useState } from "react";
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
  const {
    selectedSlot,
    selectedDate,
    setBookingStep,
    session,
    bookingDetails,
    loadBookingDetails,
    submitBooking,
  } = useAppState();

  const [name, setName] = useState(session?.user.name ?? "");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadBookingDetails(assetId);
  }, [assetId, loadBookingDetails]);

  if (!selectedSlot) return null;

  const dateObj = new Date(selectedDate + "T00:00:00Z");
  const dayLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  const ownerHasWhatsapp = Boolean(bookingDetails?.owner.whatsappNumber);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await submitBooking(assetId, {
      contactName: name,
      contactEmail: email,
      location,
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
          <label className="input-label" htmlFor="booking-name">Your name</label>
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
          <label className="input-label" htmlFor="booking-email">Your email</label>
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
          <label className="input-label" htmlFor="booking-location">Where do you need it?</label>
          <input
            id="booking-location"
            className="input"
            type="text"
            required
            minLength={2}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Address or area"
          />
        </div>

        <div className="contact-field">
          <label className="input-label" htmlFor="booking-notes">Notes (optional)</label>
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
          disabled={submitting || !ownerHasWhatsapp}
        >
          {submitting ? "Sending..." : "Send via WhatsApp →"}
        </button>
      </form>

      {!ownerHasWhatsapp && (
        <p className="contact-note">
          This asset owner has not added a WhatsApp number yet, so booking is unavailable.
        </p>
      )}
      <p className="contact-note">
        We'll save your request for <strong>{assetTitle}</strong>, then open WhatsApp to message the owner.
      </p>
    </div>
  );
}
