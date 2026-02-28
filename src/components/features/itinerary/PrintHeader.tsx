type PrintHeaderProps = {
  tripName: string;
  dateRange?: string;
  cities: string[];
};

export function PrintHeader({ tripName, dateRange, cities }: PrintHeaderProps) {
  return (
    <div data-print-header className="hidden">
      <p style={{ fontSize: "10pt", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: "4pt" }}>
        KOKU TRAVEL
      </p>
      <p style={{ fontSize: "20pt", fontWeight: "bold", marginBottom: "4pt" }}>
        {tripName}
      </p>
      {dateRange && (
        <p style={{ fontSize: "10pt", color: "#555", marginBottom: "2pt" }}>
          {dateRange}
        </p>
      )}
      {cities.length > 0 && (
        <p style={{ fontSize: "10pt", color: "#555" }}>
          {cities.join(" · ")}
        </p>
      )}
      <hr style={{ marginTop: "8pt", borderColor: "#ccc" }} />
    </div>
  );
}
