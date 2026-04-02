import { useEffect } from "react";
import { useAppState } from "../state/AppContext";

type AssetBookingPanelProps = {
  assetId: string;
};

const prettyDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export function AssetBookingPanel({ assetId }: AssetBookingPanelProps) {
  const {
    availability,
    bookingForm,
    createBooking,
    loadAvailability,
    selectedDate,
    selectDate,
    setBookingForm,
  } = useAppState();

  useEffect(() => {
    void loadAvailability(assetId, selectedDate);
  }, [assetId, selectedDate]);

  return (
    <div className="booking-layout">
      <section className="panel stack">
        <div className="section-header">
          <div>
            <p className="eyebrow">Availability</p>
            <h2>Plan your booking window</h2>
          </div>
        </div>

        <label className="stack">
          <span>Check date</span>
          <input type="date" value={selectedDate} onChange={(event) => selectDate(event.target.value)} />
        </label>

        {availability ? (
          <div className="stack">
            <div>
              <p className="label">Available windows</p>
              {availability.windows.length ? (
                availability.windows.map((window) => (
                  <div className="time-row" key={window.startAt}>
                    <strong>{prettyDateTime(window.startAt)}</strong>
                    <span>{prettyDateTime(window.endAt)}</span>
                  </div>
                ))
              ) : (
                <p>No configured availability on this date.</p>
              )}
            </div>
            <div>
              <p className="label">Active requests</p>
              {availability.bookings.length ? (
                availability.bookings.map((booking) => (
                  <div className="time-row" key={booking.id}>
                    <strong>{prettyDateTime(booking.startAt)}</strong>
                    <span>{booking.status}</span>
                  </div>
                ))
              ) : (
                <p>No active bookings on this date.</p>
              )}
            </div>
          </div>
        ) : (
          <p>Availability loads when the asset page opens.</p>
        )}
      </section>

      <form className="panel booking-panel stack" onSubmit={(event) => void createBooking(event, assetId)}>
        <div className="section-header">
          <div>
            <p className="eyebrow">Booking request</p>
            <h2>Request this asset</h2>
          </div>
        </div>
        <input
          value={bookingForm.contactName}
          onChange={(event) => setBookingForm({ ...bookingForm, contactName: event.target.value })}
          placeholder="Contact name"
        />
        <input
          value={bookingForm.contactEmail}
          onChange={(event) => setBookingForm({ ...bookingForm, contactEmail: event.target.value })}
          placeholder="Contact email"
        />
        <input
          type="datetime-local"
          value={bookingForm.startAt.slice(0, 16)}
          onChange={(event) =>
            setBookingForm({ ...bookingForm, startAt: new Date(event.target.value).toISOString() })
          }
        />
        <input
          type="datetime-local"
          value={bookingForm.endAt.slice(0, 16)}
          onChange={(event) =>
            setBookingForm({ ...bookingForm, endAt: new Date(event.target.value).toISOString() })
          }
        />
        <textarea
          value={bookingForm.notes}
          onChange={(event) => setBookingForm({ ...bookingForm, notes: event.target.value })}
          placeholder="Event notes, delivery instructions, or setup details"
        />
        <button type="submit">Submit booking request</button>
      </form>
    </div>
  );
}
