import type { Reply } from "./replyUtils";
import { remainingMs, fmtRemain } from "./replyUtils";

type EditReplyModalProps = {
  editing: Reply | null;
  editBody: string;
  onEditBodyChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function EditReplyModal({
  editing,
  editBody,
  onEditBodyChange,
  onClose,
  onConfirm,
}: EditReplyModalProps) {
  if (!editing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="p-6 space-y-4">
          <header className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Edit reply</h3>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </header>
          <textarea
            value={editBody}
            onChange={(e) => onEditBodyChange(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Edits are visible to everyone (full history kept).</span>
            <span>{fmtRemain(remainingMs(editing))} left</span>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
              onClick={onConfirm}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

