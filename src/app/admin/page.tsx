import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      joinedAt: "desc",
    },
  });

  const adminWorkspaces = memberships.filter((membership) => membership.role === "ADMIN");

  if (adminWorkspaces.length === 0) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-2xl font-bold text-amber-900">Admin Access Required</h1>
          <p className="mt-2 text-sm text-amber-800">
            You are signed in, but this account is not an admin in any workspace.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Admin Console</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Workspace Admin Panel</h1>
        <p className="mt-2 text-sm text-slate-600">
          You have admin access in {adminWorkspaces.length} workspace{adminWorkspaces.length > 1 ? "s" : ""}.
        </p>

        <ul className="mt-4 space-y-2">
          {adminWorkspaces.map((membership) => (
            <li key={membership.workspace.id} className="rounded-lg border border-slate-200 px-3 py-2">
              <p className="font-medium text-slate-900">{membership.workspace.name}</p>
              <p className="text-sm text-slate-500">/{membership.workspace.slug}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
