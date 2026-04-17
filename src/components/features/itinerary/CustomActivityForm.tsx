"use client";

import { useState } from "react";
import type { ItineraryActivity } from "@/types/itinerary";
import type { AddressResult } from "@/lib/addressSearch/types";
import { AddressAutocomplete } from "./AddressAutocomplete";

type Props = {
  onSubmit: (
    activity: Extract<ItineraryActivity, { kind: "place" }>,
    meta: { addressSource: "mapbox" | "google" | "as-is" | "none" },
  ) => void;
  onCancel: () => void;
  initial?: Partial<Extract<ItineraryActivity, { kind: "place" }>>;
};

export function CustomActivityForm({ onSubmit, onCancel, initial = {} }: Props) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [duration, setDuration] = useState(initial.durationMin ?? 60);
  const [address, setAddress] = useState(initial.address ?? "");
  const [coordinates, setCoordinates] = useState(initial.coordinates);
  const [hours, setHours] = useState(initial.customOperatingHours);
  const [addressSource, setAddressSource] = useState<"mapbox" | "google" | "as-is" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [startTime, setStartTime] = useState(initial.manualStartTime ?? "");
  const [category, setCategory] = useState<string>(initial.tags?.[0] ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [costAmount, setCostAmount] = useState(initial.costEstimate?.amount ?? 0);
  const [costCurrency, setCostCurrency] = useState(initial.costEstimate?.currency ?? "JPY");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [confirmationNumber, setConfirmationNumber] = useState(initial.confirmationNumber ?? "");

  function handleAddressSelect(r: AddressResult) {
    setAddress(r.address);
    setCoordinates(r.coordinates);
    setHours(r.openingHours);
    setAddressSource(r.source);
  }

  function handleUseAsIs(text: string) {
    setAddress(text);
    setCoordinates(undefined);
    setHours(undefined);
    setAddressSource("as-is");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const activity: Extract<ItineraryActivity, { kind: "place" }> = {
      kind: "place",
      id: initial.id ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      timeOfDay: "afternoon",
      durationMin: duration,
      isCustom: true,
      ...(address ? { address } : {}),
      ...(coordinates ? { coordinates } : {}),
      ...(hours ? { customOperatingHours: hours } : {}),
      ...(startTime ? { manualStartTime: startTime } : {}),
      ...(category ? { tags: [category] } : {}),
      ...(phone ? { phone } : {}),
      ...(website ? { website } : {}),
      ...(costAmount > 0 ? { costEstimate: { amount: costAmount, currency: costCurrency } } : {}),
      ...(notes ? { notes } : {}),
      ...(confirmationNumber ? { confirmationNumber } : {}),
    };
    onSubmit(activity, { addressSource: addressSource ?? "none" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Title*</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <div>
        <span className="text-sm font-medium">Address</span>
        <AddressAutocomplete
          onSelect={handleAddressSelect}
          onUseAsIs={handleUseAsIs}
          initialValue={address}
        />
        {addressSource === "as-is" && (
          <p className="mt-1 text-xs text-amber-600">
            No coordinates — travel times to/from this stop will be estimated.
          </p>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-medium">Duration (minutes)</span>
        <input
          type="number"
          value={duration}
          min={5}
          step={5}
          onChange={(e) => setDuration(parseInt(e.target.value, 10) || 60)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-sm text-blue-600"
      >
        {expanded ? "Hide details" : "Add more details"}
      </button>

      {expanded && (
        <div className="space-y-3 border-l-2 pl-3">
          <label className="block">
            <span className="text-sm font-medium">Start time</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="">—</option>
              <option value="food">Food</option>
              <option value="sightseeing">Sightseeing</option>
              <option value="shopping">Shopping</option>
              <option value="accommodation">Accommodation</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Website</span>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="text-sm font-medium">Cost</span>
              <input
                type="number"
                value={costAmount}
                min={0}
                onChange={(e) => setCostAmount(parseInt(e.target.value, 10) || 0)}
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>
            <label>
              <span className="text-sm font-medium">Currency</span>
              <select
                value={costCurrency}
                onChange={(e) => setCostCurrency(e.target.value)}
                className="mt-1 rounded border px-3 py-2"
              >
                <option value="JPY">JPY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Confirmation number</span>
            <input
              type="text"
              value={confirmationNumber}
              onChange={(e) => setConfirmationNumber(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded border px-4 py-2">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </form>
  );
}
