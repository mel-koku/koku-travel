import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "@/components/ui/Select";
import {
  generateAccessibilityTests,
  generateDisabledStateTests,
  generateErrorStateTests,
} from "../utils/componentTestFactory";

const mockOptions = [
  { label: "Option 1", value: "1" },
  { label: "Option 2", value: "2" },
  { label: "Option 3", value: "3" },
];

// Configure shared tests (only those compatible with Radix UI Select)
const selectConfig = {
  name: "Select",
  renderDefault: () => <Select options={mockOptions} />,
  renderWithProps: (props: Partial<React.ComponentProps<typeof Select>>) => (
    <Select options={mockOptions} {...props} />
  ),
  role: "combobox" as const,
  supportsError: true,
  supportsDisabled: true,
  disabledClasses: ["cursor-not-allowed"],
  errorClasses: ["border-error"],
};

// Generate common tests from factory (skip input/controlled — Radix Select is not a native <select>)
generateAccessibilityTests(selectConfig);
generateDisabledStateTests(selectConfig);
generateErrorStateTests(selectConfig);

// Select-specific tests
describe("Select", () => {
  describe("Rendering", () => {
    it("should render trigger element", () => {
      render(<Select options={mockOptions} />);
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
    });

    it("should render with placeholder", () => {
      render(<Select options={mockOptions} placeholder="Choose an option" />);
      expect(screen.getByText("Choose an option")).toBeInTheDocument();
    });

    it("should show selected value text", () => {
      render(<Select options={mockOptions} value="2" />);
      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });
  });

  describe("Accessibility - Custom", () => {
    it("should support custom aria-describedby", () => {
      render(<Select options={mockOptions} aria-describedby="custom-help" />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-describedby", "custom-help");
    });
  });

  describe("User interaction", () => {
    it("should call onChange when option is selected", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<Select options={mockOptions} onChange={handleChange} />);
      const trigger = screen.getByRole("combobox");
      // Open the dropdown
      await user.click(trigger);
      // Select an option from the opened dropdown
      const option = screen.getByText("Option 2");
      await user.click(option);
      expect(handleChange).toHaveBeenCalledWith({ target: { value: "2" } });
    });

    it("should show error message when error and id are provided", () => {
      render(<Select options={mockOptions} id="test-select" error="Required field" />);
      expect(screen.getByRole("alert")).toHaveTextContent("Required field");
    });
  });
});
