import { redirect } from "next/navigation";

export default function CraftsCPage() {
  redirect("/c/places?category=craft");
}
