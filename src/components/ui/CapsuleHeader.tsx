import React from "react";

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
        bg-surface rounded-xl border border-border
        shadow-soft backdrop-blur
        px-8 py-4 mx-auto
      "
    >
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-stone">{subtitle}</p>}
      </div>
      {rightButton && <div>{rightButton}</div>}
      {children}
    </div>
  );
}

