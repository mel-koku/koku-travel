export type HoursConfirmationFooterProps = {
  hoursSource?: "google" | "editorial" | "user";
};

export function HoursConfirmationFooter({
  hoursSource,
}: HoursConfirmationFooterProps) {
  if (hoursSource !== "google") return null;
  return (
    <p className="text-xs text-foreground-secondary mt-3 italic">
      Hours via Google. Confirm before you go.
    </p>
  );
}
