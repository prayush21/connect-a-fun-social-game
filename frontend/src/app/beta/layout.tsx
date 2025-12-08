import { PostHogProvider } from "@/lib/posthog";

export default function BetaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PostHogProvider>
      <section>{children}</section>
    </PostHogProvider>
  );
}
