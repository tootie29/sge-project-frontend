export const metadata = { title: "Auth callback · SGE Admin" };

export default function AuthCallbackPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-xl font-semibold tracking-tight">Auth callback</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Placeholder. This route will exchange the Supabase auth code for a
        session cookie once auth is wired up.
      </p>
    </div>
  );
}
