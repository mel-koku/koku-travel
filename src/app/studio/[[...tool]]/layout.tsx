export const metadata = {
  title: "Koku Travel Studio",
  description: "Content management studio for Koku Travel guides",
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">{children}</div>
  );
}
