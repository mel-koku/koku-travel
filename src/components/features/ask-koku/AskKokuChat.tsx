"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useCallback, useState } from "react";
import { AskKokuMessage } from "./AskKokuMessage";
import { AskKokuSuggestions } from "./AskKokuSuggestions";
import { AskKokuInput } from "./AskKokuInput";

export function AskKokuChat() {
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll on new messages
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
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4"
        data-lenis-prevent
      >
        {!hasMessages ? (
          <AskKokuSuggestions onSelect={handleSuggestion} />
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <AskKokuMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-surface px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-foreground-secondary [animation-delay:0ms]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-foreground-secondary [animation-delay:150ms]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-foreground-secondary [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-error/10 px-4 py-2.5 text-sm text-error">
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

      <AskKokuInput
        value={input}
        onChange={setInput}
        onSubmit={onSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
