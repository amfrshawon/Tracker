import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-start justify-center gap-4 px-6 py-16">
      <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        RabbyTrack
      </p>
      <h1 className="text-3xl font-bold text-slate-900">Asana-style workspace foundation is ready.</h1>
      <p className="max-w-2xl text-slate-600">
        Auth, RBAC, Prisma schema, and bootstrap APIs are configured. This repository is set up for team-based
        development.
      </p>

      <div className="flex items-center gap-3 text-sm">
        <Link className="font-medium text-sky-700 hover:text-sky-800" href="/login">
          Sign in
        </Link>
        <Link className="font-medium text-sky-700 hover:text-sky-800" href="/register">
          Create account
        </Link>
      </div>
    </main>
  );
}
