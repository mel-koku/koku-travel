import type { Reply } from "./replyUtils";
import { ReplyItem } from "./ReplyItem";

type ReplyListProps = {
  replies: Reply[];
  currentAuthor: string;
  menuOpenFor: string | null;
  onMenuToggle: (replyId: string) => void;
  onEdit: (reply: Reply) => void;
  onDelete: (replyId: string) => void;
  onShowHistory: (reply: Reply) => void;
};

export function ReplyList({
  replies,
  currentAuthor,
  menuOpenFor,
  onMenuToggle,
  onEdit,
  onDelete,
  onShowHistory,
}: ReplyListProps) {
  if (replies.length === 0) {
    return <p className="text-center text-gray-500">No replies yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {replies.map((reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          currentAuthor={currentAuthor}
          menuOpenFor={menuOpenFor}
          onMenuToggle={onMenuToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onShowHistory={onShowHistory}
        />
      ))}
    </ul>
  );
}

