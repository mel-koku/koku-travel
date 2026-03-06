import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

type BookingEmailData = {
  bookingId: string;
  personName: string;
  personType: string;
  userEmail: string;
  bookingDate: string;
  session: string;
  groupSize: number;
  totalPrice?: number;
  currency?: string;
};

function formatPrice(amount: number | undefined, currency = "JPY"): string {
  if (!amount) return "Free";
  return `${currency === "JPY" ? "¥" : currency + " "}${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function sessionLabel(session: string): string {
  return session === "morning" ? "Morning (10:00-12:00)" : "Afternoon (14:00-16:00)";
}

/**
 * Send booking confirmation to the user.
 */
export async function sendBookingConfirmation(
  data: BookingEmailData
): Promise<void> {
  const apiKey = env.resendApiKey;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — skipping booking confirmation email");
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: "Koku Travel <noreply@koku.travel>",
      to: data.userEmail,
      subject: `Booking confirmed with ${data.personName}`,
      text: [
        `Your booking has been confirmed.`,
        ``,
        `Expert: ${data.personName} (${data.personType})`,
        `Date: ${formatDate(data.bookingDate)}`,
        `Session: ${sessionLabel(data.session)}`,
        `Group size: ${data.groupSize}`,
        `Price: ${formatPrice(data.totalPrice, data.currency)}`,
        ``,
        `Booking reference: ${data.bookingId.slice(0, 8).toUpperCase()}`,
        ``,
        `You can manage your booking from your Koku Travel dashboard.`,
        ``,
        `— Koku Travel`,
      ].join("\n"),
    });
  } catch (err) {
    logger.error(
      "Failed to send booking confirmation email",
      err instanceof Error ? err : new Error(String(err))
    );
  }
}

/**
 * Send admin notification about a new booking.
 */
export async function sendBookingNotification(
  data: BookingEmailData
): Promise<void> {
  const apiKey = env.resendApiKey;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — skipping booking notification email");
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: "Koku Travel <noreply@koku.travel>",
      to: "inquiries@koku.travel",
      subject: `New booking: ${data.personName} on ${data.bookingDate}`,
      text: [
        `New booking received.`,
        ``,
        `Expert: ${data.personName} (${data.personType})`,
        `User: ${data.userEmail}`,
        `Date: ${formatDate(data.bookingDate)}`,
        `Session: ${sessionLabel(data.session)}`,
        `Group size: ${data.groupSize}`,
        `Price: ${formatPrice(data.totalPrice, data.currency)}`,
        `Ref: ${data.bookingId.slice(0, 8).toUpperCase()}`,
      ].join("\n"),
    });
  } catch (err) {
    logger.error(
      "Failed to send booking notification email",
      err instanceof Error ? err : new Error(String(err))
    );
  }
}

/**
 * Send cancellation notification to user and admin.
 */
export async function sendBookingCancellation(
  data: Omit<BookingEmailData, "totalPrice" | "currency">
): Promise<void> {
  const apiKey = env.resendApiKey;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — skipping booking cancellation email");
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const body = [
      `Booking cancelled.`,
      ``,
      `Expert: ${data.personName} (${data.personType})`,
      `Date: ${formatDate(data.bookingDate)}`,
      `Session: ${sessionLabel(data.session)}`,
      `Ref: ${data.bookingId.slice(0, 8).toUpperCase()}`,
    ].join("\n");

    await Promise.all([
      resend.emails.send({
        from: "Koku Travel <noreply@koku.travel>",
        to: data.userEmail,
        subject: `Booking cancelled — ${data.personName} on ${data.bookingDate}`,
        text: body + "\n\n— Koku Travel",
      }),
      resend.emails.send({
        from: "Koku Travel <noreply@koku.travel>",
        to: "inquiries@koku.travel",
        subject: `Booking cancelled: ${data.personName} on ${data.bookingDate}`,
        text: body + `\nUser: ${data.userEmail}`,
      }),
    ]);
  } catch (err) {
    logger.error(
      "Failed to send booking cancellation email",
      err instanceof Error ? err : new Error(String(err))
    );
  }
}
