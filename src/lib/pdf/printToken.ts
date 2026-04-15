import crypto from "node:crypto";

const TTL_SECONDS = 60;

type Payload = { tripId: string; userId: string };
type SignedPayload = Payload & { exp: number };

function getSecret(): string {
  const s = process.env.PDF_TOKEN_SECRET;
  if (!s) throw new Error("PDF_TOKEN_SECRET is not set");
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signPrintToken(tripId: string, userId: string): string {
  const payload: SignedPayload = {
    tripId,
    userId,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(
    crypto.createHmac("sha256", getSecret()).update(body).digest()
  );
  return `${body}.${sig}`;
}

export function verifyPrintToken(token: string): Payload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expectedSig = b64url(
    crypto.createHmac("sha256", getSecret()).update(body).digest()
  );
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  let payload: SignedPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number") return null;
  if (Math.floor(Date.now() / 1000) > payload.exp) return null;
  if (typeof payload.tripId !== "string" || typeof payload.userId !== "string") return null;

  return { tripId: payload.tripId, userId: payload.userId };
}
