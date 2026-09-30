"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, FileText, FolderKanban, Home, Inbox, LogOut, Settings2, Sparkles, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const links: [string, string, LucideIcon][] = [
  ["/admin", "Overview", Home], ["/admin/projects", "Projects", FolderKanban],
  ["/admin/skills", "Skills", Sparkles], ["/admin/journey", "Journey & building", ArrowUp],
  ["/admin/settings", "Homepage & settings", Settings2], ["/admin/messages", "Messages", Inbox],
  ["/admin/articles", "Articles", FileText],
];

export function AdminNav({ email }: { email?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState("");
  return <aside className="w-full shrink-0 border-b border-line bg-ink-2/70 p-4 lg:w-64 lg:border-b-0 lg:border-r lg:p-6">
    <Link href="/admin" className="mb-6 flex items-center gap-2 font-semibold"><span className="rounded-lg bg-violet/20 p-2 text-violet"><Sparkles className="size-4" /></span>Command center</Link>
    <nav aria-label="Administration" className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:block lg:space-y-1">{links.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${pathname === href ? "bg-violet/15 text-violet" : "text-muted hover:bg-surface hover:text-fg"}`}><Icon className="size-4 shrink-0" />{label}</Link>)}</nav>
    <div className="mt-6 border-t border-line pt-4"><Link href="/" className="text-xs text-muted hover:text-fg">View portfolio ↗</Link><div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted"><span className="truncate">{email}</span><button aria-label="Sign out" onClick={async () => { const { error } = await createClient().auth.signOut(); if (error) { setError("Sign out failed. Please try again."); return; } router.push("/"); router.refresh(); }}><LogOut className="size-4" /></button></div>{error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}</div>
  </aside>;
}

export function AdminFrame({ children, email }: { children: React.ReactNode; email?: string }) {
  return <div className="flex min-h-svh flex-col bg-ink lg:flex-row"><AdminNav email={email} /><main className="min-w-0 flex-1 p-4 sm:p-8 lg:p-12">{children}</main></div>;
}
