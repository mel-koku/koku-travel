import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";

/**
 * Common test patterns for form components (Input, Select, Checkbox, Radio, etc.)
 * Use this to generate standard tests that all form components should pass.
 */

type RenderFn = () => ReactElement;
type RenderWithPropsFn<P> = (props: Partial<P>) => ReactElement;

interface FormComponentTestConfig<P> {
  /** Component name for test descriptions */
  name: string;
  /** Function to render the component with default props */
  renderDefault: RenderFn;
  /** Function to render with specific props */
  renderWithProps: RenderWithPropsFn<P>;
  /** ARIA role to query the element (e.g., "textbox", "combobox", "checkbox") */
  role: string;
  /** Whether the component supports error prop */
  supportsError?: boolean;
  /** Whether the component supports disabled prop */
  supportsDisabled?: boolean;
  /** CSS classes expected when disabled */
  disabledClasses?: string[];
  /** CSS classes expected when error */
  errorClasses?: string[];
}

/**
 * Generate common accessibility tests for form components
 */
export function generateAccessibilityTests<P extends { disabled?: boolean; error?: string; id?: string }>(
  config: FormComponentTestConfig<P>
) {
  const { name, renderWithProps, role, supportsError = true, supportsDisabled = true } = config;

  describe(`${name} Accessibility`, () => {
    if (supportsDisabled) {
      it("should be disabled when disabled prop is true", () => {
        render(renderWithProps({ disabled: true } as Partial<P>));
        const element = screen.getByRole(role);
        expect(element).toBeDisabled();
      });
    }

    if (supportsError) {
      it("should have aria-invalid when error is present", () => {
        render(renderWithProps({ id: "test-field", error: "Error message" } as Partial<P>));
        const element = screen.getByRole(role);
        expect(element).toHaveAttribute("aria-invalid", "true");
      });

      it("should have aria-describedby pointing to error", () => {
        render(renderWithProps({ id: "test-field", error: "Error message" } as Partial<P>));
        const element = screen.getByRole(role);
        expect(element).toHaveAttribute("aria-describedby", "test-field-error");
      });
    }
  });
}

/**
 * Generate common disabled state tests for form components
 */
export function generateDisabledStateTests<P extends { disabled?: boolean }>(
  config: FormComponentTestConfig<P>
) {
  const { name, renderWithProps, role, disabledClasses = ["cursor-not-allowed", "bg-gray-100"] } = config;

  describe(`${name} Disabled States`, () => {
    it("should apply disabled styling", () => {
      render(renderWithProps({ disabled: true } as Partial<P>));
      const element = screen.getByRole(role);
      disabledClasses.forEach(cls => {
        expect(element).toHaveClass(cls);
      });
    });
  });
}

/**
 * Generate common error state tests for form components
 */
export function generateErrorStateTests<P extends { error?: string; id?: string }>(
  config: FormComponentTestConfig<P>
) {
  const { name, renderWithProps, role, errorClasses = ["border-red-500"] } = config;

  describe(`${name} Error States`, () => {
    it("should display error styling when error is present", () => {
      render(renderWithProps({ id: "test-field", error: "Error message" } as Partial<P>));
      const element = screen.getByRole(role);
      errorClasses.forEach(cls => {
        expect(element).toHaveClass(cls);
      });
    });
  });
}

/**
 * Generate common user interaction tests for clickable components
 */
export function generateClickInteractionTests<P extends { onClick?: () => void; disabled?: boolean }>(
  config: FormComponentTestConfig<P>
) {
  const { name, renderWithProps, role } = config;

  describe(`${name} Click Interactions`, () => {
    it("should call onClick handler when clicked", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(renderWithProps({ onClick: handleClick } as Partial<P>));
      const element = screen.getByRole(role);
      await user.click(element);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when disabled", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(renderWithProps({ onClick: handleClick, disabled: true } as Partial<P>));
      const element = screen.getByRole(role);
      await user.click(element);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
}

/**
 * Generate common user interaction tests for input components (onChange)
 */
export function generateInputInteractionTests<P extends { onChange?: (e: unknown) => void }>(
  config: FormComponentTestConfig<P>
) {
  const { name, renderWithProps, role } = config;

  describe(`${name} Input Interactions`, () => {
    it("should call onChange handler when value changes", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(renderWithProps({ onChange: handleChange } as Partial<P>));
      const element = screen.getByRole(role);

      if (role === "textbox") {
        await user.type(element, "test");
      } else if (role === "combobox") {
        await user.selectOptions(element, "1");
      } else if (role === "checkbox" || role === "radio") {
        await user.click(element);
      }

      expect(handleChange).toHaveBeenCalled();
    });
  });
}

/**
 * Generate controlled/uncontrolled component tests
 */
export function generateControlledTests<P extends { value?: string; defaultValue?: string; onChange?: (e: unknown) => void }>(
  config: FormComponentTestConfig<P>,
  options: {
    controlledValue: string;
    uncontrolledValue: string;
    typeValue?: string;
  }
) {
  const { name, renderWithProps, role } = config;
  const { controlledValue, uncontrolledValue, typeValue = " updated" } = options;

  describe(`${name} Controlled/Uncontrolled`, () => {
    it("should support controlled component pattern", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(renderWithProps({ value: controlledValue, onChange: handleChange } as Partial<P>));
      const element = screen.getByRole(role) as HTMLInputElement | HTMLSelectElement;
      expect(element.value).toBe(controlledValue);

      if (role === "textbox") {
        await user.type(element, typeValue);
      } else if (role === "combobox") {
        await user.selectOptions(element, "2");
      }

      expect(handleChange).toHaveBeenCalled();
    });

    it("should support uncontrolled component pattern", async () => {
      const user = userEvent.setup();
      render(renderWithProps({ defaultValue: uncontrolledValue } as Partial<P>));
      const element = screen.getByRole(role) as HTMLInputElement | HTMLSelectElement;
      expect(element.value).toBe(uncontrolledValue);

      if (role === "textbox") {
        await user.type(element, typeValue);
        expect(element.value).toBe(uncontrolledValue + typeValue);
      }
    });
  });
}
