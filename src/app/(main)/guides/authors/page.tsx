import { redirect } from "next/navigation";

export default function AuthorsPage() {
  redirect("/local-experts?type=author");
}
