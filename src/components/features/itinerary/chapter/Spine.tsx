import type { ReactNode } from "react";

export function Spine({ children }: { children: ReactNode }) {
  return (
    <ol
      className="spine-rail relative pl-[30px] mt-11 list-none"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, var(--border) 0, var(--border) 100%)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "1px calc(100% - 20px)",
        backgroundPosition: "12px 10px",
      }}
    >
      {children}
    </ol>
  );
}
