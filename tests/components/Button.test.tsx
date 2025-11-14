import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  describe("Rendering", () => {
    it("should render with default props", () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole("button", { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("type", "button");
    });

    it("should render with different variants", () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should render with different sizes", () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();

      rerender(<Button size="md">Medium</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should render with left and right icons", () => {
      const leftIcon = <span data-testid="left-icon">←</span>;
      const rightIcon = <span data-testid="right-icon">→</span>;
      render(
        <Button leftIcon={leftIcon} rightIcon={rightIcon}>
          With Icons
        </Button>,
      );
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });

    it("should render with fullWidth prop", () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("w-full");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes when loading", () => {
      render(<Button isLoading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toBeDisabled();
    });

    it("should be disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-disabled", "true");
    });

    it("should support custom aria-label", () => {
      render(<Button aria-label="Custom label">Button</Button>);
      const button = screen.getByRole("button", { name: /custom label/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Error states", () => {
    it("should be disabled when isLoading is true", () => {
      render(<Button isLoading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });

  describe("Form integration", () => {
    it("should support type='submit'", () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });

    it("should support type='reset'", () => {
      render(<Button type="reset">Reset</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "reset");
    });
  });

  describe("User interaction", () => {
    it("should call onClick handler when clicked", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole("button");
      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when disabled", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>,
      );
      const button = screen.getByRole("button");
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("should not call onClick when loading", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button isLoading onClick={handleClick}>
          Loading
        </Button>,
      );
      const button = screen.getByRole("button");
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});

