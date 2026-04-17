"use client";

type Props = {
  index: number;
  onClick: (index: number) => void;
};

export function AddActivityButton({ index, onClick }: Props) {
  return (
    <div className="flex justify-center py-1">
      <button
        type="button"
        aria-label="add activity"
        onClick={() => onClick(index)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-600"
      >
        +
      </button>
    </div>
  );
}
