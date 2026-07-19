"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  saveProject,
  deleteProject,
  deleteMessage,
  type AdminActionState,
} from "@/app/actions/admin";
import {
  Inbox,
  FolderOpen,
  LogOut,
  Mail,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  title: string;
  description: string;
  url: string | null;
  repo: string | null;
  tags: string[];
  published: boolean;
  sort_order: number;
};

const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-fg placeholder:text-muted/60 focus:border-violet/60 focus:outline-none";

/** Add/edit project form — used inline for both create and update. */
function ProjectForm({
  project,
  onClose,
}: {
  project?: ProjectRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    async (prev, formData) => {
      const result = await saveProject(prev, formData);
      if (result?.ok) {
        router.refresh();
        onClose();
      }
      return result;
    },
    null,
  );

  return (
    <form action={action} className="g-border space-y-3 p-5">
      {project && <input type="hidden" name="id" value={project.id} />}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {project ? `Edit “${project.title}”` : "Add project"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close form"
          className="text-muted hover:text-fg"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="title"
          required
          defaultValue={project?.title}
          placeholder="Project title"
          className={fieldClass}
        />
        <input
          name="tags"
          defaultValue={project?.tags.join(", ")}
          placeholder="Tags (comma separated)"
          className={fieldClass}
        />
      </div>
      <textarea
        name="description"
        required
        rows={2}
        defaultValue={project?.description}
        placeholder="Short description"
        className={`${fieldClass} resize-none`}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="url"
          type="url"
          defaultValue={project?.url ?? ""}
          placeholder="Live URL (https://…)"
          className={fieldClass}
        />
        <input
          name="repo"
          type="url"
          defaultValue={project?.repo ?? ""}
          placeholder="GitHub repo URL"
          className={fieldClass}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Order</span>
          <input
            name="sort_order"
            type="number"
            defaultValue={project?.sort_order ?? 0}
            className={`${fieldClass} w-20`}
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="published"
            defaultChecked={project?.published ?? true}
            className="size-4 accent-[#7c5cff]"
          />
          Published
        </label>
        <button
          type="submit"
          disabled={pending}
          className="ms-auto inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-2 text-sm font-medium text-ink transition-all hover:opacity-90 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {project ? "Save changes" : "Add project"}
        </button>
      </div>
      {state && !state.ok && (
        <p role="status" className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="size-4" /> {state.message}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="flex items-center gap-2 text-sm text-cyan">
          <CheckCircle2 className="size-4" /> {state.message}
        </p>
      )}
    </form>
  );
}

/** Admin dashboard: manage articles, projects (add/edit/remove), messages (remove). */
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
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const confirmThen =
    (msg: string) => (e: React.FormEvent<HTMLFormElement>) => {
      if (!confirm(msg)) e.preventDefault();
    };

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Signed in as {email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/articles"
            className="glass flex items-center gap-2 px-4 py-2 text-sm text-muted transition-colors hover:text-fg"
          >
            <FileText className="size-4" /> Articles
          </Link>
          <button
            onClick={signOut}
            className="glass flex items-center gap-2 px-4 py-2 text-sm text-muted transition-colors hover:text-fg"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </header>

      {/* projects */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-medium">
            <FolderOpen className="size-4 text-violet" /> Projects
            <span className="font-mono text-sm text-muted">({projects.length})</span>
          </h2>
          {!adding && (
            <button
              onClick={() => {
                setAdding(true);
                setEditingId(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-fg px-4 py-2 text-sm font-medium text-ink transition-all hover:opacity-90"
            >
              <Plus className="size-4" /> Add project
            </button>
          )}
        </div>

        {adding && (
          <div className="mb-4">
            <ProjectForm onClose={() => setAdding(false)} />
          </div>
        )}

        {projects.length === 0 && !adding ? (
          <p className="glass border-dashed p-6 text-sm text-muted">
            No projects yet — add one and it appears in the Projects section of
            the site.
          </p>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) =>
              editingId === p.id ? (
                <li key={p.id}>
                  <ProjectForm project={p} onClose={() => setEditingId(null)} />
                </li>
              ) : (
                <li key={p.id} className="glass flex items-center gap-4 p-5">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-xs ${
                      p.published ? "bg-cyan/10 text-cyan" : "bg-line text-muted"
                    }`}
                  >
                    {p.published ? "live" : "draft"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="truncate text-sm text-muted">{p.description}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setAdding(false);
                    }}
                    aria-label={`Edit ${p.title}`}
                    className="text-muted transition-colors hover:text-fg"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <form
                    action={deleteProject}
                    onSubmit={confirmThen(`Remove "${p.title}" from the site?`)}
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      aria-label={`Delete ${p.title}`}
                      className="text-muted transition-colors hover:text-red-400"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      {/* messages */}
      <section>
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
                  <div className="ms-auto flex items-center gap-3">
                    <time className="font-mono text-xs text-muted">
                      {new Date(m.created_at).toLocaleString()}
                    </time>
                    <form
                      action={deleteMessage}
                      onSubmit={confirmThen(`Delete the message from ${m.name}?`)}
                    >
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        type="submit"
                        aria-label={`Delete message from ${m.name}`}
                        className="text-muted transition-colors hover:text-red-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted">{m.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
