type ReviewRowProps = {
  label: string;
  value: string;
};

export function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
      <dt className="text-sm font-semibold text-gray-900">{label}</dt>
      <dd className="text-sm text-gray-700 sm:text-right">{value}</dd>
    </div>
  );
}

