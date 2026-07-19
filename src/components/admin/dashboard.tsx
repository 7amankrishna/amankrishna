"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Inbox, FolderOpen, LogOut, Mail } from "lucide-react";

type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

type ProjectRow = {
  id: string;
  title: string;
  description: string;
  url: string | null;
  repo: string | null;
  published: boolean;
};

/** Simple admin view: recent contact messages + project rows from Supabase. */
export function AdminDashboard({
  email,
  messages,
  projects,
}: {
  email: string;
  messages: Message[];
  projects: ProjectRow[];
}) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Signed in as {email}</p>
        </div>
        <button
          onClick={signOut}
          className="glass flex items-center gap-2 px-4 py-2 text-sm text-muted transition-colors hover:text-fg"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </header>

      {/* messages */}
      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 font-medium">
          <Inbox className="size-4 text-cyan" /> Contact messages
          <span className="font-mono text-sm text-muted">({messages.length})</span>
        </h2>
        {messages.length === 0 ? (
          <p className="glass p-6 text-sm text-muted">
            No messages yet. Submissions from the contact form appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li key={m.id} className="glass p-5">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="font-medium">{m.name}</span>
                  <a
                    href={`mailto:${m.email}`}
                    className="flex items-center gap-1 font-mono text-xs text-cyan hover:underline"
                  >
                    <Mail className="size-3" /> {m.email}
                  </a>
                  <time className="ms-auto font-mono text-xs text-muted">
                    {new Date(m.created_at).toLocaleString()}
                  </time>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted">{m.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* projects */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-medium">
          <FolderOpen className="size-4 text-violet" /> Projects
          <span className="font-mono text-sm text-muted">({projects.length})</span>
        </h2>
        {projects.length === 0 ? (
          <p className="glass p-6 text-sm text-muted">
            No dynamic projects yet. Insert rows into the projects table to
            manage the Projects section from Supabase.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id} className="glass p-5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">{p.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-xs ${
                      p.published ? "bg-cyan/10 text-cyan" : "bg-line text-muted"
                    }`}
                  >
                    {p.published ? "published" : "draft"}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-muted">{p.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
