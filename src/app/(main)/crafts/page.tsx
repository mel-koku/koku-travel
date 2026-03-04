import { redirect } from "next/navigation";

export default function CraftsPage() {
  redirect("/places?category=craft");
}
