"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCmsEntry, reorderCmsEntries, saveBuilding, saveJourney, saveProject, saveSkill } from "@/app/actions/cms";
import * as cmsActions from "@/app/actions/cms";
import type { BuildingEntry, CmsActionState, JourneyEntry, PortfolioProject, Skill } from "@/lib/portfolio-types";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { RichTextEditor } from "@/components/editor/rich-text-editor";

type Entry = PortfolioProject | Skill | JourneyEntry | BuildingEntry;
type Collection = "projects" | "skills" | "journey" | "building";
type Field = { key: string; label: string; multiline?: boolean; required?: boolean };
const entryTitle = (entry: Entry) => "name" in entry ? entry.name : (entry as PortfolioProject | JourneyEntry | BuildingEntry).title;
const actions = { projects: saveProject, skills: saveSkill, journey: saveJourney, building: saveBuilding };
const fields: Record<Collection, Field[]> = {
  projects: [
    { key: "title", label: "Title", required: true }, { key: "slug", label: "URL slug" }, { key: "category", label: "Category" },
    { key: "short_description", label: "Summary", multiline: true }, { key: "description", label: "Description", multiline: true, required: true },
    { key: "tags", label: "Tags (comma separated)" }, { key: "image", label: "Cover image URL" }, { key: "image_alt", label: "Cover image alternative text" },
    { key: "url", label: "Live URL" }, { key: "repo", label: "Repository URL" }, { key: "year", label: "Year" }, { key: "status", label: "Project status" },
    { key: "gallery", label: "Gallery JSON: [{\"url\":\"…\",\"alt\":\"…\"}]", multiline: true },
    { key: "why_built", label: "Why I built it", multiline: true }, { key: "features", label: "Features", multiline: true },
    { key: "architecture", label: "Architecture", multiline: true }, { key: "challenges", label: "Challenges", multiline: true }, { key: "learnings", label: "Learnings", multiline: true },
    { key: "seo_title", label: "SEO title" }, { key: "seo_description", label: "SEO description", multiline: true },
  ],
  skills: [{ key: "name", label: "Skill name", required: true }, { key: "category", label: "Category" }, { key: "description", label: "Description", multiline: true }, { key: "icon", label: "Icon name" }],
  journey: [{ key: "title", label: "Title", required: true }, { key: "label", label: "Label" }, { key: "period", label: "Period" }, { key: "description", label: "Description", multiline: true }, { key: "image", label: "Image URL" }, { key: "image_alt", label: "Image alternative text" }],
  building: [{ key: "title", label: "Title", required: true }, { key: "description", label: "Description", multiline: true }],
};
const input = "mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg";

function EntryForm({ collection, row, order, close }: { collection: Collection; row?: Entry; order: number; close: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CmsActionState, FormData>(async (prev, form) => {
    const result = await actions[collection](prev, form);
    if (result?.ok) { router.refresh(); close(); }
    return result;
  }, null);
  const value = (key: string) => {
    if (!row) return key === "gallery" ? "[]" : "";
    const raw = (row as unknown as Record<string, unknown>)[key];
    if (key === "tags" && Array.isArray(raw)) return raw.join(", ");
    if (key === "gallery") return JSON.stringify(raw ?? [], null, 2);
    return typeof raw === "string" ? raw : "";
  };
  return <form action={action} className="g-border mb-6 space-y-5 p-5 sm:p-6">
    <input type="hidden" name="id" value={row?.id ?? ""} />
    <div className="flex items-center justify-between"><h2 className="font-semibold">{row ? "Edit entry" : "Create entry"}</h2><button type="button" onClick={close} aria-label="Close editor"><X className="size-4" /></button></div>
    <div className="grid gap-4 sm:grid-cols-2">{fields[collection].filter(field => collection !== "projects" || !["gallery", "why_built", "features", "architecture", "challenges", "learnings"].includes(field.key)).map(field => <label key={field.key} className={`text-sm text-muted ${field.multiline ? "sm:col-span-2" : ""}`}>{field.label}{field.required ? " *" : ""}{field.multiline ? <textarea className={input} rows={3} name={field.key} required={field.required} defaultValue={value(field.key)} /> : <input className={input} name={field.key} required={field.required} defaultValue={value(field.key)} />}</label>)}</div>
    {collection === "projects" && <>
      <fieldset className="rounded-xl border border-line p-4"><legend className="px-2 text-sm font-medium">Project story</legend><div className="grid gap-4 sm:grid-cols-2">{["why_built", "features", "architecture", "challenges", "learnings"].map(key => <label key={key} className="text-sm capitalize text-muted">{key.replace("_", " ")}<textarea className={input} rows={3} name={key} defaultValue={value(key)} /></label>)}</div></fieldset>
       <fieldset className="rounded-xl border border-line p-4"><legend className="px-2 text-sm font-medium">Rich project article</legend><RichTextEditor initialHtml={typeof (row as PortfolioProject | undefined)?.content_html === "string" ? (row as PortfolioProject).content_html : ""} initialJson={(row as PortfolioProject | undefined)?.content_json} library={[]} title={row ? entryTitle(row) : "New project"} placeholder="Tell the story behind this project…" /></fieldset>
      <GalleryEditor initial={Array.isArray((row as PortfolioProject | undefined)?.gallery) ? (row as PortfolioProject).gallery : []} />
    </>}
    <div className="flex flex-wrap items-end gap-5"><label className="text-sm text-muted">Publication<select className={input} name="state" defaultValue={row?.state ?? (row?.published ? "published" : "draft")}><option value="draft">Draft — hidden</option><option value="published">Published — visible</option><option value="archived">Archived — hidden</option></select></label><label className="text-sm text-muted">Display order<input className={`${input} w-24`} name="sort_order" type="number" step="1" defaultValue={row?.sort_order ?? order} /></label>{(collection === "skills" || collection === "projects") && <label className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" name="featured" defaultChecked={row && "featured" in row ? row.featured : false} />Featured</label>}</div>
    <button disabled={pending} className="rounded-lg bg-fg px-5 py-2 text-sm font-medium text-ink disabled:opacity-50">{pending ? "Saving…" : "Save entry"}</button>{state && <p role="status" className={state.ok ? "text-sm text-cyan" : "text-sm text-red-400"}>{state.message}</p>}
  </form>;
}

function GalleryEditor({ initial }: { initial: { url: string; alt: string }[] }) {
  const [items, setItems] = useState(initial.length ? initial : [{ url: "", alt: "" }]);
  return <fieldset className="rounded-xl border border-line p-4"><legend className="px-2 text-sm font-medium">Gallery</legend><input type="hidden" name="gallery" value={JSON.stringify(items.filter(item => item.url.trim()))} /><div className="space-y-3">{items.map((item, index) => <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-xs text-muted">Image URL<input className={input} value={item.url} onChange={event => setItems(items.map((entry, i) => i === index ? { ...entry, url: event.target.value } : entry))} /></label><label className="text-xs text-muted">Alt text<input className={input} value={item.alt} onChange={event => setItems(items.map((entry, i) => i === index ? { ...entry, alt: event.target.value } : entry))} /></label><button type="button" onClick={() => setItems(items.length === 1 ? [{ url: "", alt: "" }] : items.filter((_, i) => i !== index))} className="self-end px-2 py-2 text-xs text-muted hover:text-red-400">Remove</button></div>)}</div><button type="button" onClick={() => setItems([...items, { url: "", alt: "" }])} className="mt-3 text-sm text-cyan">+ Add image</button></fieldset>;
}

export function CollectionManager({ collection, rows }: { collection: Collection; rows: Entry[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  function move(index: number, direction: number) {
    const next = [...sorted];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    const form = new FormData(); form.set("table", collection); form.set("entries", JSON.stringify(next.map((row, sort_order) => ({ id: row.id, sort_order }))));
    startTransition(async () => { try { const result = await reorderCmsEntries(form); setNotice(result?.message ?? ""); router.refresh(); } catch { setNotice("Could not update order. Please try again."); } });
  }
  function duplicate(row: Entry) {
    const duplicateProject = (cmsActions as unknown as { duplicateProject?: (form: FormData) => Promise<CmsActionState> }).duplicateProject;
    if (!duplicateProject) { setNotice("Duplication is not available until the CMS duplicateProject action is deployed."); return; }
    const form = new FormData(); form.set("id", row.id);
    startTransition(async () => { try { const result = await duplicateProject(form); setNotice(result?.message ?? "Project duplicated."); router.refresh(); } catch { setNotice("Duplication failed. Please try again."); } });
  }
  return <section className="mb-10">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold capitalize">{collection}</h1><p className="mt-1 text-sm text-muted">{rows.length} entries · drafts and archived entries stay hidden</p></div><button onClick={() => setEditing("new")} className="inline-flex items-center gap-2 rounded-lg bg-fg px-4 py-2 text-sm text-ink"><Plus className="size-4" />Add entry</button></header>
    {editing && <EntryForm key={editing} collection={collection} row={rows.find(row => row.id === editing)} order={sorted.length ? Math.max(...sorted.map(row => row.sort_order)) + 1 : 0} close={() => setEditing(null)} />}
    {notice && <p role="status" className="mb-3 text-sm text-muted">{notice}</p>}
    {rows.length === 0 && <p className="glass border-dashed p-8 text-sm text-muted">No entries yet. Create a draft to get started.</p>}
     <ul className="space-y-3">{sorted.map((row, index) => { const title = entryTitle(row); const description = "description" in row ? row.description : ""; return <li key={row.id} className="glass flex flex-wrap items-center gap-3 p-4"><span className={`rounded-full px-2 py-1 text-xs ${row.published ? "bg-cyan/10 text-cyan" : "bg-line text-muted"}`}>{row.state ?? (row.published ? "published" : "draft")}</span><div className="min-w-36 flex-1"><h2 className="font-medium">{title}</h2><p className="line-clamp-1 text-sm text-muted">{description}</p></div><div className="flex items-center gap-3"><button type="button" disabled={pending || index === 0} onClick={() => move(index, -1)} aria-label="Move up" className="p-1 disabled:opacity-30"><ArrowUp className="size-4" /></button><button type="button" disabled={pending || index === sorted.length - 1} onClick={() => move(index, 1)} aria-label="Move down" className="p-1 disabled:opacity-30"><ArrowDown className="size-4" /></button>{collection === "projects" && <><button type="button" onClick={() => duplicate(row)} aria-label="Duplicate project" className="p-1 text-muted hover:text-cyan">Copy</button><a href={`/admin/projects/${row.id}/preview`} target="_blank" rel="noreferrer" className="p-1 text-xs text-cyan">Preview</a></>}<button type="button" onClick={() => setEditing(row.id)} aria-label="Edit entry" className="p-1"><Pencil className="size-4" /></button><button type="button" disabled={pending} onClick={() => { if (!confirm("Permanently delete this entry?")) return; const form = new FormData(); form.set("table", collection); form.set("id", row.id); startTransition(async () => { try { await deleteCmsEntry(form); router.refresh(); } catch { setNotice("Delete failed. Please try again."); } }); }} aria-label="Delete entry" className="p-1 text-muted hover:text-red-400"><Trash2 className="size-4" /></button></div></li>; })}</ul>
  </section>;
}
