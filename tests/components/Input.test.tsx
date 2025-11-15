import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  describe("Rendering", () => {
    it("should render with default props", () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText("Enter text");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "text");
    });

    it("should render with leading icon", () => {
      const leadingIcon = <span data-testid="leading-icon">🔍</span>;
      render(<Input leadingIcon={leadingIcon} placeholder="Search" />);
      expect(screen.getByTestId("leading-icon")).toBeInTheDocument();
      const input = screen.getByPlaceholderText("Search");
      expect(input).toHaveClass("pl-11");
    });

    it("should render with trailing icon", () => {
      const trailingIcon = <span data-testid="trailing-icon">×</span>;
      render(<Input trailingIcon={trailingIcon} placeholder="Clear" />);
      expect(screen.getByTestId("trailing-icon")).toBeInTheDocument();
      const input = screen.getByPlaceholderText("Clear");
      expect(input).toHaveClass("pr-11");
    });

    it("should render with both leading and trailing icons", () => {
      const leadingIcon = <span data-testid="leading">🔍</span>;
      const trailingIcon = <span data-testid="trailing">×</span>;
      render(<Input leadingIcon={leadingIcon} trailingIcon={trailingIcon} placeholder="Search" />);
      expect(screen.getByTestId("leading")).toBeInTheDocument();
      expect(screen.getByTestId("trailing")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes when error is present", () => {
      render(<Input id="test-input" error="This field is required" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", "test-input-error");
      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("should support custom aria-describedby", () => {
      render(<Input aria-describedby="custom-help" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "custom-help");
    });

    it("should combine aria-describedby when error is present", () => {
      render(
        <Input id="test-input" aria-describedby="custom-help" error="Error message" />,
      );
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby");
      const describedBy = input.getAttribute("aria-describedby");
      expect(describedBy).toContain("custom-help");
      expect(describedBy).toContain("test-input-error");
    });
  });

  describe("Error states", () => {
    it("should display error message when error prop is provided", () => {
      render(<Input id="test-input" error="This field is required" />);
      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("should apply error styling when error is present", () => {
      render(<Input id="test-input" error="Error" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-red-500");
    });
  });

  describe("Disabled states", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Input disabled placeholder="Disabled" />);
      const input = screen.getByPlaceholderText("Disabled");
      expect(input).toBeDisabled();
    });

    it("should apply disabled styling", () => {
      render(<Input disabled placeholder="Disabled" />);
      const input = screen.getByPlaceholderText("Disabled");
      expect(input).toHaveClass("cursor-not-allowed", "bg-gray-100");
    });
  });

  describe("Form integration", () => {
    it("should support different input types", () => {
      const { rerender } = render(<Input type="email" placeholder="Email" />);
      expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email");

      rerender(<Input type="password" placeholder="Password" />);
      expect(screen.getByPlaceholderText("Password")).toHaveAttribute("type", "password");

      rerender(<Input type="number" placeholder="Number" />);
      expect(screen.getByPlaceholderText("Number")).toHaveAttribute("type", "number");
    });

    it("should support controlled input", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input value="test" onChange={handleChange} />);
      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("test");
      await user.type(input, " new");
      expect(handleChange).toHaveBeenCalled();
    });

    it("should support uncontrolled input", async () => {
      const user = userEvent.setup();
      render(<Input defaultValue="initial" />);
      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("initial");
      await user.type(input, " updated");
      expect(input.value).toBe("initial updated");
    });
  });

  describe("User interaction", () => {
    it("should call onChange handler when typing", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole("textbox");
      await user.type(input, "test");
      expect(handleChange).toHaveBeenCalled();
    });

    it("should call onFocus handler when focused", async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);
      const input = screen.getByRole("textbox");
      await user.click(input);
      expect(handleFocus).toHaveBeenCalled();
    });
  });
});

