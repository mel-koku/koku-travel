"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { AskYukuMessage } from "./AskYukuMessage";
import { AskYukuSuggestions, type AskYukuContext, type TripPhase } from "./AskYukuSuggestions";
import { AskYukuInput } from "./AskYukuInput";

type TripData = {
  dates?: {
    start?: string;
  };
};

function getTripPhase(tripData: string | undefined): TripPhase {
  if (!tripData) return "any";
  try {
    const trip = JSON.parse(tripData) as TripData;
    if (!trip.dates?.start) return "any";
    const startDate = new Date(trip.dates.start);
    const now = new Date();
    // If trip starts in the future, it's in planning phase
    if (startDate > now) return "planning";
    // Otherwise it's active
    return "active";
  } catch {
    return "any";
  }
}

type AskYukuChatProps = {
  onClose?: () => void;
  context?: AskYukuContext;
  tripData?: string;
};

export function AskYukuChat({ onClose, context = "default", tripData }: AskYukuChatProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          context,
          ...(tripData ? { tripContext: tripData } : {}),
        },
      }),
    [context, tripData],
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
  const tripPhase = useMemo(() => getTripPhase(tripData), [tripData]);

  return (
    <div className="flex min-h-0 h-full flex-col">
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
        data-lenis-prevent
      >
        {!hasMessages ? (
          <AskYukuSuggestions onSelect={handleSuggestion} context={context} tripPhase={tripPhase} />
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <AskYukuMessage key={message.id} message={message} onClosePanel={onClose} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-surface px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-foreground-secondary [animation-delay:0ms]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-foreground-secondary [animation-delay:150ms]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-foreground-secondary [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-error/10 px-4 py-2.5 text-sm text-error">
                {error.message?.includes("daily_cost_limit")
                  ? "You\u2019ve reached your daily Ask Yuku limit. Come back tomorrow!"
                  : error.message?.includes("global_cost_limit")
                  ? "Ask Yuku is busy right now. Try again in an hour."
                  : error.message?.includes("quota") ||
                    error.message?.includes("503") ||
                    error.message?.includes("429")
                  ? "Yuku hit a limit. Give it a minute and try again."
                  : "Couldn\u2019t get a response. Try sending that again."}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0">
        <AskYukuInput
          value={input}
          onChange={setInput}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
