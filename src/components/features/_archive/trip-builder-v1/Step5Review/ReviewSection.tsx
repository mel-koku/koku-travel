import { Button } from "@/components/ui/Button";

type ReviewSectionProps = {
  title: string;
  description: string;
  editStep: number;
  onEditStep: (step: number) => void;
  children: React.ReactNode;
};

export function ReviewSection({
  title,
  description,
  editStep,
  onEditStep,
  children,
}: ReviewSectionProps) {
  return (
    <section className="space-y-4 py-8 first:pt-0">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEditStep(editStep)}
              aria-label={`Edit ${title.toLowerCase()} section`}
            >
              Edit
            </Button>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

