import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

// Shown at "/" once this self-hosted instance already has a restaurant set
// up (see useSetupStatus / MarketingHomePage) — the full marketing pitch
// only makes sense for an unclaimed install; a live instance's public root
// should get a returning staff member to Sign in fast, with a way to reach
// the docs, not a repeat of the product's own sales page.
export function ClaimedLanding() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <Logo size={44} />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        Fedgix Restaurant OS
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This instance is already set up. Sign in to your dashboard, or check the
        docs.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button size="lg" render={<Link href="/login" />}>
          Sign in
        </Button>
        <Button variant="outline" size="lg" render={<Link href="/docs" />}>
          View documentation
        </Button>
      </div>
    </div>
  );
}
