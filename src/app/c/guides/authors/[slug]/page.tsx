import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function AuthorPageC({ params }: Props) {
  const { slug } = await params;
  redirect(`/c/local-experts?person=${slug}`);
}
