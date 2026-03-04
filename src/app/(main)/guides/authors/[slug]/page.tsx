import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/local-experts?person=${slug}`);
}
