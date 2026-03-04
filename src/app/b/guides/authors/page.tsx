import { redirect } from "next/navigation";

export default function AuthorsPageB() {
  redirect("/b/local-experts?type=author");
}
