import { SignIn } from "@clerk/nextjs";
export default function Page() {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  )
    return (
      <main className="setup">
        <h1>Demo mode is ready</h1>
        <p>Add Clerk keys to enable sign-in.</p>
        <a href="/">Back to the studio</a>
      </main>
    );
  return (
    <main className="setup">
      <SignIn forceRedirectUrl="/" />
    </main>
  );
}
