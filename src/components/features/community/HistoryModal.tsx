import type { Reply } from "./replyUtils";

type HistoryModalProps = {
  reply: Reply | null;
  onClose: () => void;
};

export function HistoryModal({ reply, onClose }: HistoryModalProps) {
  if (!reply) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="p-6 space-y-4">
          <header className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Edit history</h3>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </header>

          <ul className="space-y-3 text-sm text-gray-800 max-h-[60vh] overflow-auto">
            <li className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs text-gray-500 mb-1">
                Original •{" "}
                <time dateTime={reply.createdAt}>
                  {new Date(reply.createdAt).toLocaleString()}
                </time>
              </div>
              <pre className="whitespace-pre-wrap">
                {reply.history && reply.history.length
                  ? reply.history[0]?.body
                  : reply.body}
              </pre>
            </li>

            {reply.history &&
              reply.history.length > 0 &&
              reply.history.map((v, idx) => (
                <li key={idx} className="rounded-lg border border-gray-200 p-3">
                  <div className="text-xs text-gray-500 mb-1">
                    Edited • <time dateTime={v.editedAt}>{new Date(v.editedAt).toLocaleString()}</time>
                  </div>
                  <pre className="whitespace-pre-wrap">{v.body}</pre>
                </li>
              ))}

            {reply.editedAt && (
              <li className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500 mb-1">
                  Current (last edited) •{" "}
                  <time dateTime={reply.editedAt}>
                    {new Date(reply.editedAt).toLocaleString()}
                  </time>
                </div>
                <pre className="whitespace-pre-wrap">{reply.body}</pre>
              </li>
            )}
          </ul>

          <div className="flex items-center justify-end">
            <button
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

