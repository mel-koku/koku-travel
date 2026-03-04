import { redirect } from "next/navigation";

export default function ExperiencesPage() {
  redirect("/guides?type=activity");
}
