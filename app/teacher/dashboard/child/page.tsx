import { redirect } from "next/navigation";

interface LegacyChildPageProps {
  searchParams?: Promise<{
    childId?: string;
    teacher?: string;
    lang?: string;
  }>;
}

export default async function LegacyChildPage({ searchParams }: LegacyChildPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const nextParams = new URLSearchParams();

  if (params?.childId) {
    nextParams.set("childId", params.childId);
  }

  if (params?.teacher) {
    nextParams.set("teacher", params.teacher);
  }

  if (params?.lang === "ru" || params?.lang === "en") {
    nextParams.set("lang", params.lang);
  }

  const query = nextParams.toString();
  redirect(query ? `/teacher?${query}` : "/teacher");
}
