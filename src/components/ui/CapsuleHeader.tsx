import React from "react";
import { typography } from "@/lib/typography-system";

type CapsuleHeaderProps = {
  title: string;
  subtitle?: string;
  rightButton?: React.ReactNode;
  children?: React.ReactNode;
};

export default function CapsuleHeader({
  title,
  subtitle,
  rightButton,
  children,
}: CapsuleHeaderProps) {
  return (
    <div
      className="
        flex items-center justify-between
        w-full max-w-4xl
        bg-surface rounded-lg border border-border
        shadow-[var(--shadow-sm)] backdrop-blur
        px-8 py-4 mx-auto
      "
    >
      <div>
        <h1 className={typography({ intent: "utility-h2" })}>{title}</h1>
        {subtitle && <p className="text-sm text-stone">{subtitle}</p>}
      </div>
      {rightButton && <div>{rightButton}</div>}
      {children}
    </div>
  );
}

