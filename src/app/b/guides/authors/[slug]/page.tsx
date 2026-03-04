import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function AuthorPageB({ params }: Props) {
  const { slug } = await params;
  redirect(`/b/local-experts?person=${slug}`);
}
