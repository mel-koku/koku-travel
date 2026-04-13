import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/email/emailService", () => ({
  sendContactNotification: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "../route";
import { sendContactNotification } from "@/lib/email/emailService";

function req(body: unknown) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const baseBody = {
  name: "Alice",
  email: "alice@example.com",
  subject: "Hello",
  message: "This is a test message for contact form.",
};

describe("contact attachment validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects attachment with path-traversal filename", async () => {
    const res = await POST(req({
      ...baseBody,
      attachment: {
        filename: "../../etc/passwd.pdf",
        content: "aGVsbG8=",
        contentType: "application/pdf",
        size: 5,
      },
    }));
    expect(res.status).toBe(400);
    expect(sendContactNotification).not.toHaveBeenCalled();
  });

  it("rejects attachment with CRLF in filename (header injection)", async () => {
    const res = await POST(req({
      ...baseBody,
      attachment: {
        filename: "ok.pdf\r\nBcc: evil@example.com",
        content: "aGVsbG8=",
        contentType: "application/pdf",
        size: 5,
      },
    }));
    expect(res.status).toBe(400);
    expect(sendContactNotification).not.toHaveBeenCalled();
  });

  it("accepts a clean filename", async () => {
    const res = await POST(req({
      ...baseBody,
      attachment: {
        filename: "my-receipt_01.pdf",
        content: "aGVsbG8=",
        contentType: "application/pdf",
        size: 5,
      },
    }));
    expect(res.status).toBe(200);
    expect(sendContactNotification as unknown as Mock).toHaveBeenCalledOnce();
  });

  it("accepts a Japanese filename", async () => {
    const res = await POST(req({
      ...baseBody,
      attachment: {
        filename: "領収書.pdf",
        content: "aGVsbG8=",
        contentType: "application/pdf",
        size: 5,
      },
    }));
    expect(res.status).toBe(200);
  });

  it("accepts submissions without attachment", async () => {
    const res = await POST(req(baseBody));
    expect(res.status).toBe(200);
  });
});
