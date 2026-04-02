import { useEffect } from "react";
import { useAppState } from "../state/AppContext";
import { MonthCalendar } from "./MonthCalendar";
import { DayTimeline } from "./DayTimeline";
import { ContactForm } from "./ContactForm";

type Props = {
  assetId: string;
  assetTitle: string;
};

export function BookingCalendar({ assetId, assetTitle }: Props) {
  const {
    calendarView,
    bookingStep,
    selectedMonth,
    loadMonthAvailability,
  } = useAppState();

  useEffect(() => {
    loadMonthAvailability(assetId, selectedMonth);
  }, [assetId, selectedMonth, loadMonthAvailability]);

  if (bookingStep === "contact") {
    return <ContactForm assetId={assetId} assetTitle={assetTitle} />;
  }

  if (bookingStep === "success") {
    return <BookingSuccess assetTitle={assetTitle} />;
  }

  return (
    <div className="booking-calendar">
      <h3 className="booking-calendar-title">Book this asset</h3>
      {calendarView === "month" ? (
        <MonthCalendar assetId={assetId} />
      ) : (
        <DayTimeline assetId={assetId} />
      )}
    </div>
  );
}

function BookingSuccess({ assetTitle }: { assetTitle: string }) {
  const { lastBookingRef, bookingForm } = useAppState();

  return (
    <div className="booking-success">
      <div className="booking-success-icon">&#10003;</div>
      <h3 className="booking-success-title">Booking request sent!</h3>
      <p className="booking-success-text">
        The owner of <strong>{assetTitle}</strong> will review your request and
        contact you at <strong>{bookingForm.contactEmail}</strong>.
      </p>
      {lastBookingRef && (
        <p className="booking-success-ref">Reference: #{lastBookingRef}</p>
      )}
      <a href="/assets" className="btn btn-ghost" style={{ marginTop: 16 }}>
        Browse more assets
      </a>
    </div>
  );
}
