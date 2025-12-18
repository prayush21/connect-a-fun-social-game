import { PostHogProvider } from "@/lib/posthog";
import { TutorialWrapper } from "@/components/beta/TutorialWrapper";

export default function BetaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PostHogProvider>
      <TutorialWrapper>{children}</TutorialWrapper>
    </PostHogProvider>
  );
}
