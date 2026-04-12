import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yuku Japan Studio",
  description: "Content management studio for Yuku Japan guides",
  robots: { index: false, follow: false },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto">{children}</div>
  );
}
