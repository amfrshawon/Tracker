import Link from "next/link";

import { env } from "@/lib/env";

export default function RegisterPage() {
  if (!env.ENABLE_SIGNUP) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Sign up disabled</h1>
        <p className="text-sm text-slate-600">
          Registration is disabled. Ask your workspace admin to create accounts or set `ENABLE_SIGNUP=true`.
        </p>
        <Link href="/login" className="text-sm font-medium text-sky-700 hover:text-sky-800">
          Back to sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
      <p className="text-sm text-slate-600">This creates your user and an admin workspace.</p>

      <form method="post" action="/api/auth/register" className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500/20 focus:ring"
            placeholder="Jane Doe"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500/20 focus:ring"
            placeholder="you@company.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500/20 focus:ring"
            placeholder="At least 8 characters"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="workspaceName" className="text-sm font-medium text-slate-700">
            Workspace name
          </label>
          <input
            id="workspaceName"
            name="workspaceName"
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500/20 focus:ring"
            placeholder="Marketing Team"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Create account
        </button>
      </form>

      <p className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-medium text-sky-700 hover:text-sky-800" href="/login">
          Sign in
        </Link>
      </p>
    </main>
  );
}
