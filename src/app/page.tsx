import Link from "next/link";

import { auth, signOut } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-start justify-center gap-4 px-6 py-16">
      <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Tracer
      </p>
      <h1 className="text-3xl font-bold text-slate-900">Asana-style workspace foundation is ready.</h1>
      <p className="max-w-2xl text-slate-600">
        Auth, RBAC, Prisma schema, and bootstrap APIs are configured. This repository is set up for team-based
        development.
      </p>

      {session?.user ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-700">
            Signed in as <span className="font-semibold">{session.user.email}</span>
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link className="font-medium text-sky-700 hover:text-sky-800" href="/api/workspaces">
              View workspaces API
            </Link>
            <Link className="font-medium text-sky-700 hover:text-sky-800" href="/api/health">
              Health check
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="font-medium text-slate-700 hover:text-slate-900">
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm">
          <Link className="font-medium text-sky-700 hover:text-sky-800" href="/login">
            Sign in
          </Link>
          <Link className="font-medium text-sky-700 hover:text-sky-800" href="/register">
            Create account
          </Link>
        </div>
      )}
    </main>
  );
}
