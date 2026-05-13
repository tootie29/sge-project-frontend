import { Button } from "@/components/ui/button";

export const metadata = { title: "Sign in · SGE Admin" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Authentication is not wired up yet. This page is a placeholder and
          will be completed in the auth pass.
        </p>
      </div>
      <Button disabled>Continue with Google (coming soon)</Button>
    </div>
  );
}
