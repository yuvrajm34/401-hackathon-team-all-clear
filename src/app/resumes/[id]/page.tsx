import type { Metadata } from "next";

import { ResumeDetailView } from "@/components/resumes/ResumeDetailView";

export const metadata: Metadata = {
  title: "Resume editor",
};

export default async function ResumeDetailPage(
  props: PageProps<"/resumes/[id]">,
) {
  const { id } = await props.params;
  return <ResumeDetailView id={id} />;
}
