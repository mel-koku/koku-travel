import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "@/components/ui/Select";
import {
  generateAccessibilityTests,
  generateDisabledStateTests,
  generateErrorStateTests,
  generateInputInteractionTests,
  generateControlledTests,
} from "../utils/componentTestFactory";

const mockOptions = [
  { label: "Option 1", value: "1" },
  { label: "Option 2", value: "2" },
  { label: "Option 3", value: "3" },
];

// Configure shared tests
const selectConfig = {
  name: "Select",
  renderDefault: () => <Select options={mockOptions} />,
  renderWithProps: (props: Partial<React.ComponentProps<typeof Select>>) => (
    <Select options={mockOptions} {...props} />
  ),
  role: "combobox" as const,
  supportsError: true,
  supportsDisabled: true,
  disabledClasses: ["cursor-not-allowed", "bg-gray-100"],
  errorClasses: ["border-red-500"],
};

// Generate common tests from factory
generateAccessibilityTests(selectConfig);
generateDisabledStateTests(selectConfig);
generateErrorStateTests(selectConfig);
generateInputInteractionTests(selectConfig);
generateControlledTests(selectConfig, {
  controlledValue: "1",
  uncontrolledValue: "1",
});

// Select-specific tests
describe("Select", () => {
  describe("Rendering", () => {
    it("should render with options", () => {
      render(<Select options={mockOptions} />);
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
      expect(screen.getByText("Option 1")).toBeInTheDocument();
      expect(screen.getByText("Option 2")).toBeInTheDocument();
      expect(screen.getByText("Option 3")).toBeInTheDocument();
    });

    it("should render with placeholder", () => {
      render(<Select options={mockOptions} placeholder="Choose an option" />);
      expect(screen.getByText("Choose an option")).toBeInTheDocument();
    });

    it("should render disabled options", () => {
      const optionsWithDisabled = [
        ...mockOptions,
        { label: "Disabled Option", value: "4", disabled: true },
      ];
      render(<Select options={optionsWithDisabled} />);
      const disabledOption = screen.getByText("Disabled Option");
      expect(disabledOption).toBeInTheDocument();
      expect((disabledOption as HTMLOptionElement).disabled).toBe(true);
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
    it("should update selected value when option is selected", async () => {
      const user = userEvent.setup();
      render(<Select options={mockOptions} />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      await user.selectOptions(select, "2");
      expect(select.value).toBe("2");
    });
  });
});
