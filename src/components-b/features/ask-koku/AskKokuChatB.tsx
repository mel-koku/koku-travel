"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { AskKokuMessageB } from "./AskKokuMessageB";
import { AskKokuSuggestionsB, type AskKokuContext } from "./AskKokuSuggestionsB";
import { AskKokuInputB } from "./AskKokuInputB";

type AskKokuChatProps = {
  onClose?: () => void;
  context?: AskKokuContext;
};

export function AskKokuChatB({ onClose, context = "default" }: AskKokuChatProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: { "X-Koku-Context": context },
      }),
    [context],
  );

  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({ transport });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      sendMessage({ text: suggestion });
    },
    [sendMessage],
  );

  const onSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }, [input, isLoading, sendMessage]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-h-0 h-full flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
        data-lenis-prevent
      >
        {!hasMessages ? (
          <AskKokuSuggestionsB onSelect={handleSuggestion} context={context} />
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <AskKokuMessageB key={message.id} message={message} onClosePanel={onClose} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-[var(--surface)] px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--primary)] [animation-delay:0ms]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--primary)] [animation-delay:150ms]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--primary)] [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-[var(--error)]/5 px-4 py-2.5 text-sm text-[var(--error)]">
                {error.message?.includes("quota") ||
                error.message?.includes("503") ||
                error.message?.includes("429")
                  ? "Koku is taking a break. Try again in a minute."
                  : "Something went wrong. Try again."}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0">
        <AskKokuInputB
          value={input}
          onChange={setInput}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
