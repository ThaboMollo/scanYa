import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? "bookings@scanya.app";

export async function sendBookingCreatedEmail(
  ownerEmail: string,
  assetTitle: string,
  booking: { contact_name: string; contact_email: string; start_at: string; end_at: string; notes?: string | null },
) {
  const start = new Date(booking.start_at).toLocaleString("en-ZA");
  const end = new Date(booking.end_at).toLocaleString("en-ZA");

  await resend.emails.send({
    from: fromAddress,
    to: ownerEmail,
    subject: `New booking request for ${assetTitle}`,
    text: [
      `You have a new booking request for ${assetTitle}.`,
      ``,
      `Contact: ${booking.contact_name} (${booking.contact_email})`,
      `When: ${start} – ${end}`,
      booking.notes ? `Notes: ${booking.notes}` : "",
      ``,
      `Log in to your dashboard to confirm or reject this booking.`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export async function sendBookingVerificationEmail(
  contactEmail: string,
  contactName: string,
  assetTitle: string,
  verifyUrl: string,
) {
  await resend.emails.send({
    from: fromAddress,
    to: contactEmail,
    subject: `Confirm your booking for ${assetTitle}`,
    text: [
      `Hi ${contactName},`,
      ``,
      `Please confirm your booking request for ${assetTitle} by clicking the link below:`,
      ``,
      verifyUrl,
      ``,
      `This link expires in 24 hours.`,
      ``,
      `If you didn't make this request, you can safely ignore this email.`,
    ].join("\n"),
  });
}

export async function sendBookingStatusEmail(
  contactEmail: string,
  contactName: string,
  status: "confirmed" | "rejected",
) {
  const statusMessage =
    status === "confirmed"
      ? "Your booking has been confirmed! You're all set."
      : "Unfortunately, your booking request has been declined.";

  await resend.emails.send({
    from: fromAddress,
    to: contactEmail,
    subject: `Booking ${status}`,
    text: [
      `Hi ${contactName},`,
      ``,
      statusMessage,
      ``,
      `Visit your bookings page for details.`,
    ].join("\n"),
  });
}
