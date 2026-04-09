export const metadata = {
  title: "Yuku Japan Studio",
  description: "Content management studio for Yuku Japan guides",
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
