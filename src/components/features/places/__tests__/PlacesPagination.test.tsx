import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlacesPagination } from "../PlacesPagination";

const renderPagination = (overrides: Partial<React.ComponentProps<typeof PlacesPagination>> = {}) => {
  const onPageChange = vi.fn();
  const props = {
    currentPage: 1,
    totalPages: 10,
    onPageChange,
    ...overrides,
  };
  render(<PlacesPagination {...props} />);
  return { onPageChange };
};

describe("PlacesPagination", () => {
  it("renders nothing when totalPages is 1", () => {
    const { container } = render(
      <PlacesPagination currentPage={1} totalPages={1} onPageChange={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders all page numbers when totalPages <= 7", () => {
    renderPagination({ currentPage: 3, totalPages: 7 });
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByRole("button", { name: `Go to page ${i}` })).toBeInTheDocument();
    }
    expect(screen.queryByText("…")).not.toBeInTheDocument();
  });

  it("windows with ellipsis when current is at the start", () => {
    renderPagination({ currentPage: 1, totalPages: 50 });
    expect(screen.getByRole("button", { name: "Go to page 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Go to page 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 50" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to page 25" })).not.toBeInTheDocument();
  });

  it("windows with ellipsis when current is at the end", () => {
    renderPagination({ currentPage: 50, totalPages: 50 });
    expect(screen.getByRole("button", { name: "Go to page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 48" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 49" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 50" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Go to page 25" })).not.toBeInTheDocument();
  });

  it("expands window near the second page (currentPage=2)", () => {
    renderPagination({ currentPage: 2, totalPages: 50 });
    expect(screen.getByRole("button", { name: "Go to page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Go to page 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 50" })).toBeInTheDocument();
  });

  it("windows with ellipsis on both sides when current is in the middle", () => {
    renderPagination({ currentPage: 25, totalPages: 50 });
    expect(screen.getByRole("button", { name: "Go to page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 24" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 25" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Go to page 26" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 50" })).toBeInTheDocument();
  });

  it("disables Previous on the first page", () => {
    renderPagination({ currentPage: 1, totalPages: 10 });
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
  });

  it("disables Next on the last page", () => {
    renderPagination({ currentPage: 10, totalPages: 10 });
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).not.toBeDisabled();
  });

  it("calls onPageChange with the clicked page number", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPagination({ currentPage: 3, totalPages: 10 });
    await user.click(screen.getByRole("button", { name: "Go to page 4" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("Previous and Next move one page", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPagination({ currentPage: 3, totalPages: 10 });
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it("exposes aria-label on the nav region", () => {
    renderPagination();
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });
});
