import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/Input";
import {
  generateAccessibilityTests,
  generateDisabledStateTests,
  generateErrorStateTests,
  generateInputInteractionTests,
  generateControlledTests,
} from "../utils/componentTestFactory";

// Configure shared tests
const inputConfig = {
  name: "Input",
  renderDefault: () => <Input placeholder="Enter text" />,
  renderWithProps: (props: Partial<React.ComponentProps<typeof Input>>) => (
    <Input placeholder="Test input" {...props} />
  ),
  role: "textbox" as const,
  supportsError: true,
  supportsDisabled: true,
  disabledClasses: ["disabled:cursor-not-allowed"],
  errorClasses: ["border-destructive"],
};

// Generate common tests from factory
generateAccessibilityTests(inputConfig);
generateDisabledStateTests(inputConfig);
generateErrorStateTests(inputConfig);
generateInputInteractionTests(inputConfig);
generateControlledTests(inputConfig, {
  controlledValue: "test",
  uncontrolledValue: "initial",
  typeValue: " updated",
});

// Input-specific tests
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

  describe("Accessibility - Custom", () => {
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

  describe("Error display", () => {
    it("should display error message when error prop is provided", () => {
      render(<Input id="test-input" error="This field is required" />);
      expect(screen.getByText("This field is required")).toBeInTheDocument();
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
  });

  describe("User interaction", () => {
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
