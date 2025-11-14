import Avatar from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/time";
import type { Reply } from "./replyUtils";
import { canEditDelete, remainingMs, fmtRemain } from "./replyUtils";

type ReplyItemProps = {
  reply: Reply;
  currentAuthor: string;
  menuOpenFor: string | null;
  onMenuToggle: (replyId: string) => void;
  onEdit: (reply: Reply) => void;
  onDelete: (replyId: string) => void;
  onShowHistory: (reply: Reply) => void;
};

export function ReplyItem({
  reply,
  currentAuthor,
  menuOpenFor,
  onMenuToggle,
  onEdit,
  onDelete,
  onShowHistory,
}: ReplyItemProps) {
  const mine = reply.author.trim() === currentAuthor.trim();
  const remain = remainingMs(reply);
  const allowed = canEditDelete(reply, currentAuthor);

  return (
    <li className="relative rounded-2xl border border-gray-200 bg-white shadow-md p-5">
      {/* Meta */}
      <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-2">
          <Avatar name={reply.author} />
          <span className="font-medium text-gray-700">{reply.author}</span>
          <span>•</span>
          <time
            dateTime={reply.createdAt}
            title={new Date(reply.createdAt).toLocaleString()}
          >
            {timeAgo(reply.editedAt ?? reply.createdAt)}
          </time>
          {reply.editedAt && <span className="italic text-gray-400">(edited)</span>}
          {mine && remain > 0 && (
            <span className="ml-2 text-[11px] text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">
              {fmtRemain(remain)} left to edit/delete
            </span>
          )}
        </span>

        {/* Reply actions menu */}
        <div className="relative">
          <button
            className="h-8 w-8 rounded-full hover:bg-gray-100 text-gray-600"
            onClick={() => onMenuToggle(reply.id)}
            aria-label="Reply actions"
          >
            ⋯
          </button>
          {menuOpenFor === reply.id && (
            <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg text-sm z-10">
              <button
                className={`block w-full text-left px-3 py-2 hover:bg-gray-50 ${
                  !allowed ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => (allowed ? onEdit(reply) : null)}
              >
                Edit
              </button>
              <button
                className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                onClick={() => onShowHistory(reply)}
              >
                View history
              </button>
              <button
                className={`block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 ${
                  !allowed ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => (allowed ? onDelete(reply.id) : null)}
              >
                Delete
              </button>
              {!allowed && (
                <div className="px-3 py-2 text-[11px] text-gray-500 border-t">
                  Only the author can edit/delete within 5 minutes.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <p className="whitespace-pre-wrap text-gray-800 text-sm">{reply.body}</p>
    </li>
  );
}

