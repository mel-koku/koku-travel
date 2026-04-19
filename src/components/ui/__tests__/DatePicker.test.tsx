import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DatePicker } from "../DatePicker";

function renderDatePicker(overrides: Partial<React.ComponentProps<typeof DatePicker>> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <DatePicker
      id="trip-start"
      label="Trip start date"
      onChange={onChange}
      {...overrides}
    />,
  );
  return { ...utils, onChange };
}

describe("<DatePicker> accessibility", () => {
  it("trigger has role combobox (not raw button)", () => {
    renderDatePicker();
    const trigger = screen.getByRole("combobox", { name: /Trip start date/i });
    expect(trigger).toBeDefined();
    expect(trigger.tagName).toBe("BUTTON");
  });

  it("exposes aria-haspopup=dialog and starts collapsed", () => {
    renderDatePicker();
    const trigger = screen.getByRole("combobox");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("wires aria-controls to the popover id", () => {
    renderDatePicker();
    const trigger = screen.getByRole("combobox");
    expect(trigger.getAttribute("aria-controls")).toBe("trip-start-popover");
  });

  it("sets aria-required when required=true", () => {
    renderDatePicker({ required: true });
    const trigger = screen.getByRole("combobox");
    // Testing library normalizes aria-required to string "true" on the DOM node.
    expect(trigger.getAttribute("aria-required")).toBe("true");
  });

  it("does not set aria-required when required is omitted", () => {
    renderDatePicker();
    const trigger = screen.getByRole("combobox");
    // The prop is `aria-required={undefined}` which React omits from the DOM.
    expect(trigger.getAttribute("aria-required")).toBeNull();
  });

  it("sets aria-invalid when an error is present", () => {
    renderDatePicker({ error: "Pick a valid date" });
    const trigger = screen.getByRole("combobox");
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
  });

  it("renders a visually-hidden live region for selected-value announcements", () => {
    const { container } = renderDatePicker({ value: "2026-08-15" });
    const liveRegion = container.querySelector('[aria-live="polite"].sr-only');
    expect(liveRegion).toBeDefined();
    expect(liveRegion?.textContent).toContain("Aug 15, 2026");
  });

  it("live region is empty when no date is selected", () => {
    const { container } = renderDatePicker();
    const liveRegion = container.querySelector('[aria-live="polite"].sr-only');
    expect(liveRegion?.textContent).toBe("");
  });

  it("opens popover on ArrowDown key when closed", () => {
    renderDatePicker();
    const trigger = screen.getByRole("combobox");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("opens popover on ArrowUp key when closed (symmetry for combobox pattern)", () => {
    renderDatePicker();
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("FormField does not re-inject aria-required (child owns it via combobox role)", () => {
    // This guards the FormField audit change: when the DatePicker's button
    // sets aria-required={required} itself, FormField's cloneElement path
    // must not clobber it onto the same node with a different value or
    // inject it when the child says false.
    renderDatePicker({ required: false });
    const trigger = screen.getByRole("combobox");
    // With required=false, aria-required={false} is passed to React but React
    // renders it as the attribute "aria-required=false" on the DOM. The
    // important thing is FormField hasn't ALSO set it to "true".
    const value = trigger.getAttribute("aria-required");
    expect(value === null || value === "false").toBe(true);
  });
});
