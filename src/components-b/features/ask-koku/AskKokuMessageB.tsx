"use client";

import ReactMarkdown from "react-markdown";
import type { UIMessage } from "ai";
import { AskKokuLocationCardB } from "./AskKokuLocationCardB";
import { AskKokuTripPlanCardB } from "./AskKokuTripPlanCardB";
import { AskKokuVideoImportCardB } from "./AskKokuVideoImportCardB";
import type { TripPlanData } from "@/components/features/ask-koku/AskKokuTripPlanCard";
import type { VideoImportData } from "@/components/features/ask-koku/AskKokuVideoImportCard";

type AskKokuMessageProps = {
  message: UIMessage;
  onClosePanel?: () => void;
};

type LocationToolResult = {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number | null;
  image: string;
  primaryPhotoUrl: string | null;
};

function extractLocations(message: UIMessage): LocationToolResult[] {
  const locations: LocationToolResult[] = [];
  const seenIds = new Set<string>();

  for (const part of message.parts) {
    if (
      part.type.startsWith("tool-") ||
      part.type === "dynamic-tool"
    ) {
      const toolPart = part as { state: string; output?: unknown };
      if (toolPart.state !== "output-available") continue;
      const result = toolPart.output as Record<string, unknown> | undefined;
      if (!result) continue;

      if (result.locations && Array.isArray(result.locations)) {
        for (const loc of result.locations) {
          if (loc.id && !seenIds.has(loc.id)) {
            seenIds.add(loc.id);
            locations.push(loc);
          }
        }
      }

      if (result.location && typeof result.location === "object") {
        const loc = result.location as LocationToolResult;
        if (loc.id && !seenIds.has(loc.id)) {
          seenIds.add(loc.id);
          locations.push(loc);
        }
      }
    }
  }

  return locations;
}

function extractTripPlan(message: UIMessage): TripPlanData | null {
  for (const part of message.parts) {
    if (
      part.type.startsWith("tool-") ||
      part.type === "dynamic-tool"
    ) {
      const toolPart = part as { state: string; output?: unknown };
      if (toolPart.state !== "output-available") continue;
      const result = toolPart.output as Record<string, unknown> | undefined;
      if (!result) continue;

      if (result.type === "tripPlan" && result.plan) {
        return result as unknown as TripPlanData;
      }
    }
  }
  return null;
}

function extractVideoImport(message: UIMessage): VideoImportData | null {
  for (const part of message.parts) {
    if (
      part.type.startsWith("tool-") ||
      part.type === "dynamic-tool"
    ) {
      const toolPart = part as { state: string; output?: unknown };
      if (toolPart.state !== "output-available") continue;
      const result = toolPart.output as Record<string, unknown> | undefined;
      if (!result) continue;

      if (result.type === "videoImport") {
        return result as unknown as VideoImportData;
      }
    }
  }
  return null;
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function AskKokuMessageB({ message, onClosePanel }: AskKokuMessageProps) {
  const isUser = message.role === "user";
  const locations = isUser ? [] : extractLocations(message);
  const tripPlan = isUser ? null : extractTripPlan(message);
  const videoImport = isUser ? null : extractVideoImport(message);
  const textContent = getTextContent(message);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-[var(--primary)] text-white"
            : "bg-[var(--surface)] text-[var(--foreground)]"
        }`}
      >
        {textContent && (
          <div className="chat-markdown text-sm leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                ul: ({ children }) => (
                  <ul className="mb-1.5 ml-4 list-disc last:mb-0">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-1.5 ml-4 list-decimal last:mb-0">{children}</ol>
                ),
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                a: ({ href, children }) => {
                  if (href?.startsWith("location:")) {
                    return (
                      <span className="font-semibold text-[var(--primary)]">
                        {children}
                      </span>
                    );
                  }
                  return (
                    <a
                      href={href}
                      className="text-[var(--primary)] underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {textContent}
            </ReactMarkdown>
          </div>
        )}

        {tripPlan && (
          <AskKokuTripPlanCardB data={tripPlan} onClose={onClosePanel} />
        )}

        {videoImport && (
          <AskKokuVideoImportCardB data={videoImport} />
        )}

        {locations.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {locations.map((loc) => (
              <AskKokuLocationCardB
                key={loc.id}
                id={loc.id}
                name={loc.name}
                category={loc.category}
                city={loc.city}
                rating={loc.rating}
                image={loc.image}
                primaryPhotoUrl={loc.primaryPhotoUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
