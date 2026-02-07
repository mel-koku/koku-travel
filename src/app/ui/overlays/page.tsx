"use client";

import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { Tooltip } from "@/components/ui/Tooltip";

function ModalDemo() {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-charcoal">Modal</h2>
        <p className="text-sm text-warm-gray">
          Centered overlay with focus trap, escape-to-close, and blurred backdrop. Use for key actions that
          pause page interaction.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setOpen(true)}>Plan trip with concierge</Button>
        <p className="text-sm text-stone">
          Try keyboard navigation and the escape key while the modal is open.
        </p>
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Concierge planning session"
        description="Share your travel goals and we’ll build a bespoke itinerary in 24 hours."
      >
        <div className="space-y-5">
          <p className="text-sm text-warm-gray">
            We’ll pair you with a destination specialist. Expect a 30-minute call, a curated activity list,
            and transit guidance tailored to your pace.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setOpen(false)}>Reserve session</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Not right now
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function TooltipDemo() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-charcoal">Tooltip</h2>
        <p className="text-sm text-warm-gray">
          Hover or focus to reveal supplemental guidance. Tooltips fade in with a brief delay to avoid
          surprise.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-6">
        <Tooltip content="Cultural hotspots, seasonal picks, and hidden cafés.">
          <Button variant="secondary">Explore Kyoto</Button>
        </Tooltip>
        <Tooltip content="Add this itinerary to your saved collection." side="bottom">
          <span
            tabIndex={0}
            className="text-sm text-brand-primary underline decoration-dotted underline-offset-4 focus:outline-none"
          >
            Save to library
          </span>
        </Tooltip>
      </div>
    </section>
  );
}

function DropdownDemo() {
  const [selection, setSelection] = useState("Not selected");

  const items = useMemo(
    () => [
      {
        id: "tmc",
        label: "Tokyo modern culture",
        description: "Architecture walks, design hotels, and omakase dinners.",
        onSelect: () => setSelection("Tokyo modern culture"),
      },
      {
        id: "coastal",
        label: "Coastal slow travel",
        description: "Island ferries, seaside ryokans, and local seafood nights.",
        onSelect: () => setSelection("Coastal slow travel"),
      },
      {
        id: "alpine",
        label: "Alpine escape",
        description: "Snow country onsens, powder days, and lantern-lit streets.",
        onSelect: () => setSelection("Alpine escape"),
      },
    ],
    [],
  );

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-charcoal">Dropdown</h2>
        <p className="text-sm text-warm-gray">
          Use for compact menus. Supports arrow-key navigation, escape-to-close, and outside click
          dismissal.
        </p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Dropdown label="Select itinerary theme" items={items} />
        <p className="text-sm text-stone">
          Selected: <span className="font-medium text-charcoal">{selection}</span>
        </p>
      </div>
    </section>
  );
}

function AlertDemo() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-charcoal">Alerts</h2>
        <p className="text-sm text-warm-gray">
          Inline feedback with calm color accents. Use dismissible alerts sparingly so critical messages stay
          visible.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Alert
          tone="info"
          title="Heads up"
        >
          <p className="text-sm text-warm-gray">
            Tokyo booking windows open six months ahead. Add reminders so you don’t miss flagship ryokans.
          </p>
        </Alert>
        <Alert
          tone="success"
          title="Payment confirmed"
          description="We emailed your receipt and updated your shared itinerary."
          dismissible
        />
        <Alert
          tone="warning"
          title="Weather shift"
          description="Typhoon Lan may affect train schedules next weekend. Consider flexible travel days."
        />
        <Alert
          tone="error"
          title="Action required"
          description="JR Pass verification failed. Re-upload passport details to finalize tickets."
          dismissible
        />
      </div>
    </section>
  );
}

export default function OverlaysDemoPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-10 py-16">
      <header className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Design System
        </span>
        <h1 className="text-4xl font-bold leading-tight text-charcoal">Overlay Components</h1>
        <p className="max-w-2xl text-lg text-warm-gray">
          Modals, tooltips, dropdown menus, and alerts built with headless behavior. Each example highlights
          accessible keyboard flows and calm motion tuned to the Koku aesthetic.
        </p>
      </header>

      <ModalDemo />
      <TooltipDemo />
      <DropdownDemo />
      <AlertDemo />
    </div>
  );
}


