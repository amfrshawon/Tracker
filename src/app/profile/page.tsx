import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Profile</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{session.user.name ?? "Workspace User"}</h1>
        <p className="mt-1 text-sm text-slate-600">{session.user.email ?? "No email"}</p>
      </div>
    </main>
  );
}
