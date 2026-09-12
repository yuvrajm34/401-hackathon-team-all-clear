import type { Metadata } from "next";

import { ApplicationDetailView } from "@/components/applications/ApplicationDetailView";

export const metadata: Metadata = {
  title: "Application",
};

export default async function ApplicationDetailPage(
  props: PageProps<"/applications/[id]">,
) {
  const { id } = await props.params;
  return <ApplicationDetailView id={id} />;
}
