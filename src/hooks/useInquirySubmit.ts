import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/context/ToastContext";
import type { BookingInquiryInput } from "@/types/person";

async function submitInquiry(
  input: BookingInquiryInput & { personSlug: string }
): Promise<{ id: string }> {
  const res = await fetch("/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to submit inquiry");
  }
  return res.json();
}

export function useInquirySubmit() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: submitInquiry,
    onSuccess: () => {
      showToast("Inquiry sent. We'll be in touch within 48 hours.", {
        variant: "success",
      });
    },
    onError: (err: Error) => {
      showToast(err.message || "Something went wrong. Try again.", {
        variant: "error",
      });
    },
  });
}
