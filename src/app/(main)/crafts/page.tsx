import { redirect } from "next/navigation";

export default function CraftsPage() {
  redirect("/experiences?type=workshop");
}
