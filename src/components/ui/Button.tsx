import Link from "next/link";
import { ComponentPropsWithoutRef, ReactNode, forwardRef } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonBaseProps = {
  /**
   * Visual style for the button.
   * Defaults to the primary variant.
   */
  variant?: ButtonVariant;
  /**
   * Predefined sizing tokens for consistent spacing.
   */
  size?: ButtonSize;
  /**
   * Render a spinner and apply aria-busy while preserving layout.
   */
  isLoading?: boolean;
  /**
   * Optional icon rendered before the button label.
   */
  leftIcon?: ReactNode;
  /**
   * Optional icon rendered after the button label.
   */
  rightIcon?: ReactNode;
  /**
   * Expand to fill the full width of the parent container.
   */
  fullWidth?: boolean;
};

type NativeButtonProps = ButtonBaseProps &
  ComponentPropsWithoutRef<"button"> & {
    asChild?: false;
  };

type AnchorButtonProps = ButtonBaseProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
    /**
     * Render the button as a Next.js Link while preserving button styles.
     */
    asChild: true;
    href: string;
  };

export type ButtonProps = NativeButtonProps | AnchorButtonProps;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-white shadow-sm hover:bg-brand-primary/90 focus-visible:ring-brand-primary",
  secondary:
    "bg-brand-secondary text-white shadow-sm hover:bg-brand-secondary/90 focus-visible:ring-brand-secondary",
  outline:
    "border border-neutral-border bg-neutral-surface text-neutral-textPrimary hover:bg-neutral-surface/80 focus-visible:ring-brand-primary",
  ghost:
    "bg-transparent text-neutral-textPrimary hover:bg-neutral-surface/70 focus-visible:ring-brand-primary",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-base",
  lg: "h-12 px-5 text-base",
};

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin text-current"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth,
      className,
      children,
      asChild,
      ...rest
    } = props;

    const baseClasses = cn(
      "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && "w-full",
      isLoading && "pointer-events-none",
      className,
    );

    const content = (
      <span className="flex w-full items-center justify-center gap-2">
        {(isLoading || leftIcon) && (
          <span
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center",
              isLoading ? "" : "text-current",
            )}
            aria-hidden={isLoading}
          >
            {isLoading ? <Spinner /> : leftIcon}
          </span>
        )}
        <span className="truncate">{children}</span>
        {rightIcon && !isLoading && (
          <span className="inline-flex h-5 w-5 items-center justify-center">{rightIcon}</span>
        )}
      </span>
    );

    if (asChild) {
      const { href, prefetch, replace, scroll, shallow, locale, ...anchorProps } =
        rest as AnchorButtonProps;
      const ariaDisabledRaw = anchorProps["aria-disabled"];
      const anchorDisabled =
        typeof ariaDisabledRaw === "boolean"
          ? ariaDisabledRaw
          : ariaDisabledRaw === "false"
            ? false
            : Boolean(ariaDisabledRaw);

      return (
        <Link
          ref={ref as never}
          href={href}
          prefetch={prefetch}
          replace={replace}
          scroll={scroll}
          shallow={shallow}
          locale={locale}
          className={cn(baseClasses, (anchorDisabled || isLoading) && "pointer-events-none")}
          aria-busy={isLoading}
          aria-disabled={anchorDisabled || isLoading}
          {...anchorProps}
        >
          {content}
        </Link>
      );
    }

    const { disabled, type = "button", ...buttonProps } = rest as NativeButtonProps;

    return (
      <button
        ref={ref as never}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        className={baseClasses}
        {...buttonProps}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = "Button";

