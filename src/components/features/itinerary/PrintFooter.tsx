export function PrintFooter() {
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div data-print-footer className="hidden">
      <hr style={{ borderColor: "#ccc", marginBottom: "6pt" }} />
      <p>
        Generated {today} &middot; kokutravel.com
      </p>
    </div>
  );
}
