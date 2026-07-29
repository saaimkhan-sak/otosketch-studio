import { AppShell } from "@/components/app/AppShell";
import { SafetyBanner } from "@/components/app/SafetyBanner";

export default function Home() {
  return (
    <>
      <SafetyBanner />
      <AppShell />
    </>
  );
}
