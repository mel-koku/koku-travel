import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DropdownMenu } from "@/components/features/itinerary/chapter/DropdownMenu";

describe("DropdownMenu", () => {
  it("opens menu on trigger click", () => {
    render(
      <DropdownMenu
        trigger={<button type="button">Open</button>}
        items={[{ label: "Share", onClick: () => {} }]}
      />,
    );
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("closes menu on Escape key", () => {
    render(
      <DropdownMenu
        trigger={<button type="button">Open</button>}
        items={[{ label: "Share", onClick: () => {} }]}
      />,
    );
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("fires item onClick when item clicked", () => {
    const onClick = vi.fn();
    render(
      <DropdownMenu
        trigger={<button type="button">Open</button>}
        items={[{ label: "Share", onClick }]}
      />,
    );
    fireEvent.click(screen.getByText("Open"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Share" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("closes menu after item click", () => {
    render(
      <DropdownMenu
        trigger={<button type="button">Open</button>}
        items={[{ label: "Share", onClick: () => {} }]}
      />,
    );
    fireEvent.click(screen.getByText("Open"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Share" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
