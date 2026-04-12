import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/context/ToastContext";

type ContactInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachment?: {
    filename: string;
    content: string; // base64
    contentType: string;
    size: number;
  };
};

async function submitContact(input: ContactInput): Promise<{ success: true }> {
  const res = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to send message");
  }
  return res.json();
}

export function useContactSubmit() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: submitContact,
    onError: (err: Error) => {
      showToast(err.message || "Something went wrong. Try again.", {
        variant: "error",
      });
    },
  });
}
