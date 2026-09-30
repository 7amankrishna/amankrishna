"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveMessage, deleteMessage, markMessageRead } from "@/app/actions/cms";

export type ContactMessage = { id: string; name: string; email: string; subject?: string | null; message: string; created_at: string; read_at?: string | null; archived_at?: string | null };
export function MessagesPanel({ messages }: { messages: ContactMessage[] }) {
  const [archived, setArchived] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function act(message: ContactMessage, kind: "read" | "archive" | "delete") {
    if (kind === "delete" && !confirm(`Permanently delete the message from ${message.name}?`)) return;
    const form = new FormData(); form.set("id", message.id); form.set("unread", String(Boolean(message.read_at))); form.set("restore", String(Boolean(message.archived_at)));
    startTransition(async () => { try { await ({ read: markMessageRead, archive: archiveMessage, delete: deleteMessage })[kind](form); setNotice("Message updated."); router.refresh(); } catch { setNotice("Could not update this message. Please try again."); } });
  }
  const visible = messages.filter(message => Boolean(message.archived_at) === archived);
  return <><header className="mb-8"><p className="eyebrow mb-2">Inbox</p><h1 className="text-3xl font-semibold">Messages</h1><p className="mt-2 text-sm text-muted">Contact submissions from your portfolio.</p></header><div className="mb-5 flex gap-2">{[false, true].map(value => <button key={String(value)} onClick={() => setArchived(value)} className={`rounded-lg px-4 py-2 text-sm ${archived === value ? "bg-violet/15 text-violet" : "text-muted"}`}>{value ? "Archived" : "Inbox"}</button>)}</div>{notice && <p role="status" className="mb-4 text-sm text-muted">{notice}</p>}<ul className="space-y-3">{visible.map(message => <li key={message.id} className="glass p-5"><div className="mb-3 flex flex-wrap items-center gap-3"><h2 className="font-semibold">{message.name}</h2>{!message.read_at && <span className="rounded-full bg-cyan/10 px-2 py-1 text-xs text-cyan">Unread</span>}<time dateTime={message.created_at} className="ms-auto text-xs text-muted">{new Date(message.created_at).toISOString().slice(0, 10)}</time></div><a className="break-all text-sm text-cyan" href={`mailto:${message.email}`}>{message.email}</a><p className="my-4 whitespace-pre-wrap break-words text-sm text-muted">{message.message}</p><div className="flex flex-wrap gap-4 border-t border-line pt-3 text-xs"><a href={`mailto:${message.email}`} className="text-cyan">Reply by email</a><button disabled={pending} onClick={() => act(message, "read")}>{message.read_at ? "Mark unread" : "Mark read"}</button><button disabled={pending} onClick={() => act(message, "archive")}>{message.archived_at ? "Restore" : "Archive"}</button><button disabled={pending} onClick={() => act(message, "delete")} className="text-red-400">Delete</button></div></li>)}{visible.length === 0 && <li className="glass p-8 text-sm text-muted">No {archived ? "archived " : ""}messages.</li>}</ul></>;
}
