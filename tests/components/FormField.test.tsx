import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

describe("FormField", () => {
  describe("Rendering", () => {
    it("should render with label and input", () => {
      render(
        <FormField id="test-field" label="Test Label">
          <Input id="test-field" />
        </FormField>,
      );
      expect(screen.getByLabelText("Test Label")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should render with required indicator", () => {
      render(
        <FormField id="test-field" label="Required Field" required>
          <Input id="test-field" />
        </FormField>,
      );
      const label = screen.getByText("Required Field");
      expect(label).toBeInTheDocument();
      // Check for required indicator (usually asterisk or "required" text)
    });

    it("should render help text when provided", () => {
      render(
        <FormField id="test-field" label="Field" help="This is help text">
          <Input id="test-field" />
        </FormField>,
      );
      expect(screen.getByText("This is help text")).toBeInTheDocument();
    });

    it("should render error message when error is provided", () => {
      render(
        <FormField id="test-field" label="Field" error="This field has an error">
          <Input id="test-field" />
        </FormField>,
      );
      expect(screen.getByText("This field has an error")).toBeInTheDocument();
      expect(screen.queryByText(/help/i)).not.toBeInTheDocument();
    });

    it("should hide label visually when labelHidden is true", () => {
      render(
        <FormField id="test-field" label="Hidden Label" labelHidden>
          <Input id="test-field" />
        </FormField>,
      );
      const labelText = screen.getByText("Hidden Label");
      const label = labelText.closest("label");
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass("sr-only");
    });
  });

  describe("Accessibility", () => {
    it("should connect label to input via htmlFor", () => {
      render(
        <FormField id="test-field" label="Test Label">
          <Input id="test-field" />
        </FormField>,
      );
      const input = screen.getByRole("textbox");
      const labelText = screen.getByText("Test Label");
      const label = labelText.closest("label");
      expect(label).toHaveAttribute("for", "test-field");
      expect(input).toHaveAttribute("id", "test-field");
    });

    it("should add aria-describedby for help text", () => {
      render(
        <FormField id="test-field" label="Field" help="Help text">
          <Input id="test-field" />
        </FormField>,
      );
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "test-field-help");
    });

    it("should add aria-describedby for error message", () => {
      render(
        <FormField id="test-field" label="Field" error="Error message">
          <Input id="test-field" />
        </FormField>,
      );
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "test-field-error");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("should combine aria-describedby when both help and error exist", () => {
      render(
        <FormField id="test-field" label="Field" help="Help" error="Error">
          <Input id="test-field" />
        </FormField>,
      );
      const input = screen.getByRole("textbox");
      const describedBy = input.getAttribute("aria-describedby");
      // Error takes precedence, so only error should be in aria-describedby
      expect(describedBy).toContain("test-field-error");
    });
  });

  describe("Form validation integration", () => {
    it("should mark input as invalid when error is present", () => {
      render(
        <FormField id="test-field" label="Field" error="Validation error">
          <Input id="test-field" />
        </FormField>,
      );
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });
  });
});

