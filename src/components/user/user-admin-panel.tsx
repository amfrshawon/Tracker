"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

type UserAdminPanelProps = {
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  workspaceName?: string | null;
  isAdmin: boolean;
  compact?: boolean;
  placement?: "bottom-end" | "bottom-start" | "top-start" | "top-end";
};

function initials(name: string | null, email: string): string {
  const source = (name?.trim() || email).replace(/\s+/g, " ");
  const parts = source.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function placementClass(placement: NonNullable<UserAdminPanelProps["placement"]>): string {
  if (placement === "bottom-start") return "top-full left-0 mt-2";
  if (placement === "top-start") return "bottom-full left-0 mb-2";
  if (placement === "top-end") return "bottom-full right-0 mb-2";
  return "top-full right-0 mt-2";
}

function avatarStyle(userImage: string | null): React.CSSProperties | undefined {
  if (!userImage) return undefined;

  return {
    backgroundImage: `url(${userImage})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

export function UserAdminPanel({
  userName,
  userEmail,
  userImage,
  workspaceName,
  isAdmin,
  compact = false,
  placement = "bottom-end",
}: UserAdminPanelProps) {
  const [open, setOpen] = useState(false);
  const [isOutOfOffice, setIsOutOfOffice] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [upgradeText, setUpgradeText] = useState("Upgrade");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fallbackInitials = useMemo(() => initials(userName, userEmail), [userEmail, userName]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className={`inline-flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-50 ${
          compact ? "w-full justify-between" : ""
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700"
          style={avatarStyle(userImage)}
        >
          {userImage ? "" : fallbackInitials}
        </span>
        <span className={`min-w-0 ${compact ? "flex-1" : "hidden sm:block"}`}>
          <span className="block truncate text-sm font-semibold text-slate-800">
            {userName ?? "Workspace user"}
          </span>
          <span className="block truncate text-xs text-slate-500">{isAdmin ? "Admin" : "Member"}</span>
        </span>
        <span className="text-xs text-slate-500">▾</span>
      </button>

      {open ? (
        <div
          className={`absolute z-50 w-80 max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${placementClass(placement)}`}
          role="menu"
        >
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-sm font-semibold text-slate-700"
                style={avatarStyle(userImage)}
              >
                {userImage ? "" : fallbackInitials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xl font-semibold text-slate-900">{userName ?? "Workspace user"}</p>
                <p className="truncate text-sm text-slate-600">{userEmail}</p>
                {workspaceName ? (
                  <p className="truncate text-xs uppercase tracking-[0.12em] text-slate-500">{workspaceName}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 p-3">
            <button
              type="button"
              onClick={() => setIsOutOfOffice((previous) => !previous)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {isOutOfOffice ? "Set back in office" : "Set out of office"}
            </button>
          </div>

          <div className="border-b border-slate-200 p-2">
            {isAdmin ? (
              <Link href="/admin" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                Admin console
              </Link>
            ) : null}
            <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              New workspace
            </Link>
            <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              Invite teammates
            </Link>
            <button
              type="button"
              onClick={() => setUpgradeText("Upgrade plan requested")}
              className="mt-1 w-full rounded-lg bg-amber-300/90 px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-300"
            >
              {upgradeText}
            </button>
          </div>

          <div className="border-b border-slate-200 p-2">
            <Link href="/profile" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              Profile
            </Link>
            <Link href="/settings" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              Settings
            </Link>
            <Link
              href="/login"
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Add another account
            </Link>
          </div>

          <div className="p-2">
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              disabled={isSigningOut}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              {isSigningOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
