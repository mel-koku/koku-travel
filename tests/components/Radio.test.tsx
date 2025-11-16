import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Radio, RadioGroup } from "@/components/ui/Radio";

describe("Radio", () => {
  describe("Rendering", () => {
    it("should render with label", () => {
      render(<Radio label="Option 1" name="test" value="1" />);
      expect(screen.getByLabelText("Option 1")).toBeInTheDocument();
    });

    it("should render with description", () => {
      render(<Radio label="Option" description="Description text" name="test" value="1" />);
      expect(screen.getByText("Option")).toBeInTheDocument();
      expect(screen.getByText("Description text")).toBeInTheDocument();
    });

    it("should be unchecked by default", () => {
      render(<Radio label="Radio" name="test" value="1" />);
      const radio = screen.getByRole("radio");
      expect(radio).not.toBeChecked();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<Radio label="Test radio" description="Description" name="test" value="1" />);
      const radio = screen.getByRole("radio");
      expect(radio).toHaveAttribute("aria-describedby");
    });

    it("should be disabled when disabled prop is true", () => {
      render(<Radio label="Disabled radio" disabled name="test" value="1" />);
      const radio = screen.getByRole("radio");
      expect(radio).toBeDisabled();
    });
  });

  describe("User interaction", () => {
    it("should select radio when clicked", async () => {
      const user = userEvent.setup();
      render(<Radio label="Option 1" name="test" value="1" />);
      const radio = screen.getByRole("radio");
      expect(radio).not.toBeChecked();
      await user.click(radio);
      expect(radio).toBeChecked();
    });

    it("should call onChange handler when clicked", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Radio label="Option" name="test" value="1" onChange={handleChange} />);
      const radio = screen.getByRole("radio");
      await user.click(radio);
      expect(handleChange).toHaveBeenCalled();
    });

    it("should not select when disabled", async () => {
      const user = userEvent.setup();
      render(<Radio label="Disabled" disabled name="test" value="1" />);
      const radio = screen.getByRole("radio");
      expect(radio).not.toBeChecked();
      await user.click(radio);
      expect(radio).not.toBeChecked();
    });
  });

  describe("Radio group behavior", () => {
    it("should allow only one radio to be selected in a group", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Radio label="Option 1" name="group" value="1" />
          <Radio label="Option 2" name="group" value="2" />
          <Radio label="Option 3" name="group" value="3" />
        </>,
      );
      const radio1 = screen.getByRole("radio", { name: /option 1/i });
      const radio2 = screen.getByRole("radio", { name: /option 2/i });
      const radio3 = screen.getByRole("radio", { name: /option 3/i });

      await user.click(radio1);
      expect(radio1).toBeChecked();
      expect(radio2).not.toBeChecked();
      expect(radio3).not.toBeChecked();

      await user.click(radio2);
      expect(radio1).not.toBeChecked();
      expect(radio2).toBeChecked();
      expect(radio3).not.toBeChecked();
    });
  });

  describe("Controlled component", () => {
    it("should respect checked prop", () => {
      const handleChange = vi.fn();
      render(<Radio label="Controlled" checked name="test" value="1" onChange={handleChange} />);
      const radio = screen.getByRole("radio");
      expect(radio).toBeChecked();
    });
  });
});

describe("RadioGroup", () => {
  it("should render with legend", () => {
    render(
      <RadioGroup legend="Select option">
        <Radio label="Option 1" name="group" value="1" />
        <Radio label="Option 2" name="group" value="2" />
      </RadioGroup>,
    );
    expect(screen.getByText("Select option")).toBeInTheDocument();
  });

  it("should render with help text", () => {
    render(
      <RadioGroup legend="Options" helpText="Choose one option">
        <Radio label="Option 1" name="group" value="1" />
      </RadioGroup>,
    );
    expect(screen.getByText("Choose one option")).toBeInTheDocument();
  });
});

