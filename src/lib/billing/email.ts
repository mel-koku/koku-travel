import "server-only";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

const FROM_ADDRESS = "Yuku Japan <trips@yukujapan.com>";

type UnlockEmailParams = {
  to: string;
  tripName: string;
  tripUrl: string;
  amountFormatted: string;
  tier: string;
  cities: string[];
  totalDays: number;
  firstMorningTip?: string;
};

export async function sendUnlockConfirmationEmail(params: UnlockEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set, skipping confirmation email");
    return;
  }

  const resend = new Resend(apiKey);
  const cityList = params.cities
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join(", ");

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `Your ${params.totalDays}-day Japan trip is ready`,
      text: [
        "Your Yuku Trip Pass is confirmed.",
        "",
        params.tripName,
        `${params.totalDays} days across ${cityList}`,
        params.amountFormatted,
        "",
        `View your trip: ${params.tripUrl}`,
        "",
        params.firstMorningTip || "",
        "",
        "If your plans change or something isn't right, reply to this email.",
        "",
        "Safe travels,",
        "Yuku Japan",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } catch (err) {
    logger.error(
      "Failed to send unlock confirmation email",
      err instanceof Error ? err : new Error(String(err)),
    );
  }
}
