import "server-only";
import { Resend } from "resend";

const FROM_ADDRESS = "Yuku Japan <trips@yukujapan.com>";
const REPLY_TO = "hello@yukujapan.com";

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

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(params: UnlockEmailParams, cityList: string): string {
  const preheader = `${params.totalDays} days across ${cityList}. Everything is ready when you are.`;
  const tipBlock = params.firstMorningTip
    ? `<p style="margin:0 0 24px;color:#2C2825;font-size:15px;line-height:1.6;font-style:italic;">${escapeHtml(params.firstMorningTip)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Japan trip is confirmed</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Plus Jakarta Sans',Roboto,Helvetica,Arial,sans-serif;color:#2C2825;">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;">
  <tr><td align="center" style="padding:48px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E5E0D8;border-radius:12px;">
      <tr><td style="padding:40px 40px 8px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:#6B6058;">Trip Pass</p>
        <h1 style="margin:0 0 16px;font-family:Georgia,'Cormorant Garamond',serif;font-size:32px;line-height:1.2;font-weight:500;color:#2C2825;">Your Japan trip is confirmed.</h1>
        <p style="margin:0 0 32px;color:#2C2825;font-size:16px;line-height:1.6;">${params.totalDays} days across ${escapeHtml(cityList)}. Routes, meals, and daily notes are ready whenever you open the itinerary.</p>
      </td></tr>
      <tr><td style="padding:0 40px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EE;border-radius:8px;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 4px;font-size:12px;color:#6B6058;letter-spacing:0.05em;text-transform:uppercase;">Trip</p>
            <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:18px;color:#2C2825;">${escapeHtml(params.tripName)}</p>
            <p style="margin:0 0 4px;font-size:12px;color:#6B6058;letter-spacing:0.05em;text-transform:uppercase;">Amount paid</p>
            <p style="margin:0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:16px;color:#2C2825;">${escapeHtml(params.amountFormatted)}</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:8px 40px 32px;">
        <a href="${escapeHtml(params.tripUrl)}" style="display:inline-block;background:#E23828;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:500;letter-spacing:0.01em;">Open your itinerary</a>
      </td></tr>
      ${tipBlock ? `<tr><td style="padding:0 40px 24px;">${tipBlock}</td></tr>` : ""}
      <tr><td style="padding:24px 40px 40px;border-top:1px solid #E5E0D8;">
        <p style="margin:0 0 8px;color:#6B6058;font-size:14px;line-height:1.6;">If something is off or your plans change, reply to this email and we will sort it.</p>
        <p style="margin:0;color:#6B6058;font-size:14px;line-height:1.6;">Safe travels,<br>Yuku Japan</p>
      </td></tr>
    </table>
    <p style="margin:24px 0 0;color:#6B6058;font-size:12px;">Yuku Japan, trip planning for Japan travelers.</p>
  </td></tr>
</table>
</body>
</html>`;
}

function renderText(params: UnlockEmailParams, cityList: string): string {
  return [
    "Your Japan trip is confirmed.",
    "",
    `${params.totalDays} days across ${cityList}. Routes, meals, and daily notes are ready whenever you open the itinerary.`,
    "",
    `Trip: ${params.tripName}`,
    `Amount paid: ${params.amountFormatted}`,
    "",
    `Open your itinerary: ${params.tripUrl}`,
    "",
    params.firstMorningTip || "",
    "",
    "If something is off or your plans change, reply to this email and we will sort it.",
    "",
    "Safe travels,",
    "Yuku Japan",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendUnlockConfirmationEmail(params: UnlockEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not set");
  }

  const resend = new Resend(apiKey);
  const cityList = params.cities
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join(", ");

  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    replyTo: REPLY_TO,
    to: params.to,
    subject: "Your Japan trip is confirmed",
    html: renderHtml(params, cityList),
    text: renderText(params, cityList),
  });

  if (result.error) {
    throw new Error(
      `Resend rejected email: ${result.error.name} — ${result.error.message}`,
    );
  }
}
