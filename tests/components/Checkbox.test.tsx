import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox, CheckboxGroup } from "@/components/ui/Checkbox";

describe("Checkbox", () => {
  describe("Rendering", () => {
    it("should render with label", () => {
      render(<Checkbox label="Accept terms" />);
      expect(screen.getByLabelText("Accept terms")).toBeInTheDocument();
    });

    it("should render with description", () => {
      render(<Checkbox label="Subscribe" description="Receive email updates" />);
      expect(screen.getByText("Subscribe")).toBeInTheDocument();
      expect(screen.getByText("Receive email updates")).toBeInTheDocument();
    });

    it("should be unchecked by default", () => {
      render(<Checkbox label="Checkbox" />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<Checkbox label="Test checkbox" description="Description" />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute("aria-describedby");
    });

    it("should be disabled when disabled prop is true", () => {
      render(<Checkbox label="Disabled checkbox" disabled />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeDisabled();
    });
  });

  describe("User interaction", () => {
    it("should toggle checked state when clicked", async () => {
      const user = userEvent.setup();
      render(<Checkbox label="Toggle me" />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it("should call onChange handler when clicked", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Checkbox label="Click me" onChange={handleChange} />);
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);
      expect(handleChange).toHaveBeenCalled();
    });

    it("should not toggle when disabled", async () => {
      const user = userEvent.setup();
      render(<Checkbox label="Disabled" disabled />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe("Controlled component", () => {
    it("should respect checked prop", () => {
      const handleChange = vi.fn();
      render(<Checkbox label="Controlled" checked onChange={handleChange} />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    it("should update when checked prop changes", () => {
      const handleChange = vi.fn();
      const { rerender } = render(<Checkbox label="Controlled" checked={false} onChange={handleChange} />);
      let checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
      rerender(<Checkbox label="Controlled" checked={true} onChange={handleChange} />);
      checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });
  });
});

describe("CheckboxGroup", () => {
  it("should render with legend", () => {
    render(
      <CheckboxGroup legend="Select options">
        <Checkbox label="Option 1" />
        <Checkbox label="Option 2" />
      </CheckboxGroup>,
    );
    expect(screen.getByText("Select options")).toBeInTheDocument();
  });

  it("should render with help text", () => {
    render(
      <CheckboxGroup legend="Options" helpText="Choose all that apply">
        <Checkbox label="Option 1" />
      </CheckboxGroup>,
    );
    expect(screen.getByText("Choose all that apply")).toBeInTheDocument();
  });
});

