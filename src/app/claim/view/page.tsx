import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: { id?: string };
};

export default function Page({ searchParams }: PageProps) {
  const id = searchParams?.id;
  if (!id) {
    redirect("/");
  }
  redirect(`/claim/${encodeURIComponent(id)}?origin=entry`);
}

