import type { Metadata } from "next";

import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Set your weekly goal, switch themes, and export or import your ApplyPath data.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
