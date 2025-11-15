import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "@/components/ui/Select";

const mockOptions = [
  { label: "Option 1", value: "1" },
  { label: "Option 2", value: "2" },
  { label: "Option 3", value: "3" },
];

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
      const select = screen.getByRole("combobox");
      const disabledOption = screen.getByText("Disabled Option");
      expect(disabledOption).toBeInTheDocument();
      expect((disabledOption as HTMLOptionElement).disabled).toBe(true);
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes when error is present", () => {
      render(<Select id="test-select" options={mockOptions} error="This field is required" />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-invalid", "true");
      expect(select).toHaveAttribute("aria-describedby", "test-select-error");
    });

    it("should be disabled when disabled prop is true", () => {
      render(<Select options={mockOptions} disabled />);
      const select = screen.getByRole("combobox");
      expect(select).toBeDisabled();
    });

    it("should support custom aria-describedby", () => {
      render(<Select options={mockOptions} aria-describedby="custom-help" />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-describedby", "custom-help");
    });
  });

  describe("Error states", () => {
    it("should display error styling when error is present", () => {
      render(<Select id="test-select" options={mockOptions} error="Error message" />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveClass("border-red-500");
    });
  });

  describe("Disabled states", () => {
    it("should apply disabled styling", () => {
      render(<Select options={mockOptions} disabled />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveClass("cursor-not-allowed", "bg-gray-100");
    });
  });

  describe("Form integration", () => {
    it("should support controlled select", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Select options={mockOptions} value="1" onChange={handleChange} />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("1");
      await user.selectOptions(select, "2");
      expect(handleChange).toHaveBeenCalled();
    });

    it("should support uncontrolled select", async () => {
      const user = userEvent.setup();
      render(<Select options={mockOptions} defaultValue="1" />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("1");
      await user.selectOptions(select, "2");
      expect(select.value).toBe("2");
    });
  });

  describe("User interaction", () => {
    it("should call onChange handler when option is selected", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Select options={mockOptions} onChange={handleChange} />);
      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "2");
      expect(handleChange).toHaveBeenCalled();
    });

    it("should update selected value when option is selected", async () => {
      const user = userEvent.setup();
      render(<Select options={mockOptions} />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      await user.selectOptions(select, "2");
      expect(select.value).toBe("2");
    });
  });
});

