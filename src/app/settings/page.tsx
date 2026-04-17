import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Settings</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Account & Workspace Settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Signed in as {session.user.email ?? "Unknown"}. Configuration panels for notifications, preferences,
          and workspace policies can be expanded here.
        </p>
      </div>
    </main>
  );
}
