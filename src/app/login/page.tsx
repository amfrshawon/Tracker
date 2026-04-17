import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const rawParams = (await searchParams) ?? {};
  const error = Array.isArray(rawParams.error) ? rawParams.error[0] : rawParams.error;
  const registered = Array.isArray(rawParams.registered) ? rawParams.registered[0] : rawParams.registered;

  async function loginAction(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/login?error=${encodeURIComponent(error.type)}`);
      }
      throw error;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="text-sm text-slate-600">
        Use your workspace email and password. If this is a fresh install, create an account first.
      </p>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Sign-in failed. Check credentials and try again.
        </p>
      ) : null}

      {registered ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Account created successfully. Please sign in.
        </p>
      ) : null}

      <form action={loginAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500/20 focus:ring"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Sign in
        </button>
      </form>

      <p className="text-sm text-slate-600">
        Need an account?{" "}
        <Link className="font-medium text-sky-700 hover:text-sky-800" href="/register">
          Create one
        </Link>
      </p>
    </main>
  );
}
