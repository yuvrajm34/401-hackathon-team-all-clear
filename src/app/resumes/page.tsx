import type { Metadata } from "next";

import { ResumesView } from "@/components/resumes/ResumesView";

export const metadata: Metadata = {
  title: "Resumes",
  description:
    "Keep a master resume and tailor a copy for each application without retyping anything.",
};

export default function ResumesPage() {
  return <ResumesView />;
}
