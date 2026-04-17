"use client";

import { useEffect, useRef, useState } from "react";
import { createSessionToken } from "@/lib/addressSearch/sessionToken";
import type { AddressResult, AddressSuggestion } from "@/lib/addressSearch/types";
import { trackGoogleFallbackTapped } from "@/lib/analytics/customLocations";

type Props = {
  onSelect: (result: AddressResult) => void;
  onUseAsIs: (text: string) => void;
  initialValue?: string;
};

export function AddressAutocomplete({ onSelect, onUseAsIs, initialValue = "" }: Props) {
  const [value, setValue] = useState(initialValue);
  const [mapboxSuggestions, setMapboxSuggestions] = useState<AddressSuggestion[]>([]);
  const [googleSuggestions, setGoogleSuggestions] = useState<AddressSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const tokenRef = useRef<string>(createSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) {
      setMapboxSuggestions([]);
      setGoogleSuggestions(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/address-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "suggest",
            provider: "mapbox",
            query: value,
            sessionToken: tokenRef.current,
          }),
        });
        if (res.ok) {
          const body = await res.json();
          setMapboxSuggestions(body.suggestions ?? []);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  async function selectSuggestion(s: AddressSuggestion, provider: "mapbox" | "google") {
    const res = await fetch("/api/address-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "retrieve",
        provider,
        id: s.id,
        sessionToken: tokenRef.current,
      }),
    });
    if (res.ok) {
      const body = await res.json();
      onSelect(body.result as AddressResult);
      tokenRef.current = createSessionToken();
    }
  }

  async function searchGoogle() {
    trackGoogleFallbackTapped({ mapboxResultCount: mapboxSuggestions.length });
    const res = await fetch("/api/address-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "suggest",
        provider: "google",
        query: value,
        sessionToken: tokenRef.current,
      }),
    });
    if (res.ok) {
      const body = await res.json();
      setGoogleSuggestions(body.suggestions ?? []);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Address or place name"
        className="w-full rounded border px-3 py-2"
      />
      {value.length >= 3 && (
        <div className="mt-1 rounded border bg-white shadow">
          {loading && <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>}
          {mapboxSuggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSuggestion(s, "mapbox")}
              className="block w-full px-3 py-2 text-left hover:bg-gray-50"
            >
              <div className="font-medium">{s.title}</div>
              {s.subtitle && <div className="text-sm text-gray-500">{s.subtitle}</div>}
            </button>
          ))}
          {googleSuggestions?.map((s) => (
            <button
              key={`g-${s.id}`}
              type="button"
              onClick={() => selectSuggestion(s, "google")}
              className="block w-full px-3 py-2 text-left hover:bg-gray-50"
            >
              <div className="font-medium">🔵 {s.title}</div>
              {s.subtitle && <div className="text-sm text-gray-500">{s.subtitle}</div>}
            </button>
          ))}
          <div className="border-t">
            <button
              type="button"
              onClick={searchGoogle}
              className="block w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-gray-50"
            >
              🔍 Search Google instead
            </button>
            <button
              type="button"
              onClick={() => onUseAsIs(value)}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              ✏️ Use &quot;{value}&quot; as-is
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
