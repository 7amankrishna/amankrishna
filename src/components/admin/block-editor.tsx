"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Type,
  Heading2,
  Image as ImageIcon,
  Code2,
  Quote,
  List,
  Minus,
} from "lucide-react";
import type { Block, BlockType } from "@/lib/posts";
import { cn } from "@/lib/utils";

/** Palette of insertable block types. */
const BLOCK_TYPES: { type: BlockType; icon: typeof Type; label: string }[] = [
  { type: "paragraph", icon: Type, label: "Paragraph" },
  { type: "heading", icon: Heading2, label: "Heading" },
  { type: "image", icon: ImageIcon, label: "Image" },
  { type: "code", icon: Code2, label: "Code" },
  { type: "quote", icon: Quote, label: "Quote" },
  { type: "list", icon: List, label: "List" },
  { type: "divider", icon: Minus, label: "Divider" },
];

function newBlock(type: BlockType): Block {
  return {
    id: crypto.randomUUID(),
    type,
    content: "",
    meta: type === "heading" ? { level: 2 } : type === "list" ? { items: [""] } : {},
  };
}

const fieldClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:border-violet/60 focus:outline-none";

/** One sortable block row: drag handle + type-specific inputs + delete. */
function SortableBlock({
  block,
  onChange,
  onDelete,
}: {
  block: Block;
  onChange: (b: Block) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const meta = BLOCK_TYPES.find((t) => t.type === block.type)!;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "glass group flex items-start gap-2 p-3",
        isDragging && "z-10 opacity-80 shadow-xl shadow-violet/20",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${meta.label} block`}
        className="mt-1.5 cursor-grab touch-none text-muted hover:text-fg active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>

      <div className="min-w-0 flex-1 space-y-2">
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
          <meta.icon className="size-3" /> {meta.label}
        </span>

        {block.type === "paragraph" && (
          <textarea
            rows={3}
            value={block.content}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            placeholder="Write a paragraph…"
            className={cn(fieldClass, "resize-y")}
          />
        )}

        {block.type === "heading" && (
          <div className="flex gap-2">
            <input
              value={block.content}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              placeholder="Heading text"
              className={fieldClass}
            />
            <select
              value={block.meta?.level ?? 2}
              onChange={(e) =>
                onChange({
                  ...block,
                  meta: { ...block.meta, level: Number(e.target.value) as 2 | 3 },
                })
              }
              aria-label="Heading level"
              className={cn(fieldClass, "w-20")}
            >
              <option value={2}>H2</option>
              <option value={3}>H3</option>
            </select>
          </div>
        )}

        {block.type === "image" && (
          <div className="space-y-2">
            <input
              value={block.content}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              placeholder="Image URL (https://…)"
              className={fieldClass}
            />
            <input
              value={block.meta?.alt ?? ""}
              onChange={(e) =>
                onChange({ ...block, meta: { ...block.meta, alt: e.target.value } })
              }
              placeholder="Alt text (describe the image)"
              className={fieldClass}
            />
            {block.content && (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote URLs
              <img
                src={block.content}
                alt={block.meta?.alt ?? ""}
                className="max-h-40 rounded-lg border border-line object-cover"
              />
            )}
          </div>
        )}

        {block.type === "code" && (
          <div className="space-y-2">
            <input
              value={block.meta?.lang ?? ""}
              onChange={(e) =>
                onChange({ ...block, meta: { ...block.meta, lang: e.target.value } })
              }
              placeholder="Language (ts, py, sql…)"
              className={cn(fieldClass, "w-44 font-mono")}
            />
            <textarea
              rows={5}
              value={block.content}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              placeholder="// code"
              spellCheck={false}
              className={cn(fieldClass, "resize-y font-mono text-xs")}
            />
          </div>
        )}

        {block.type === "quote" && (
          <textarea
            rows={2}
            value={block.content}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            placeholder="Quote text"
            className={cn(fieldClass, "resize-y italic")}
          />
        )}

        {block.type === "list" && (
          <div className="space-y-1.5">
            {(block.meta?.items ?? [""]).map((item, i) => (
              <input
                key={i}
                value={item}
                onChange={(e) => {
                  const items = [...(block.meta?.items ?? [])];
                  items[i] = e.target.value;
                  onChange({ ...block, meta: { ...block.meta, items } });
                }}
                onKeyDown={(e) => {
                  // Enter adds an item; Backspace on empty removes it
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const items = [...(block.meta?.items ?? [])];
                    items.splice(i + 1, 0, "");
                    onChange({ ...block, meta: { ...block.meta, items } });
                  } else if (e.key === "Backspace" && item === "" && (block.meta?.items?.length ?? 0) > 1) {
                    e.preventDefault();
                    const items = (block.meta?.items ?? []).filter((_, j) => j !== i);
                    onChange({ ...block, meta: { ...block.meta, items } });
                  }
                }}
                placeholder={`Item ${i + 1} (Enter adds, Backspace removes)`}
                className={fieldClass}
              />
            ))}
          </div>
        )}

        {block.type === "divider" && (
          <hr className="border-line" aria-label="Divider block" />
        )}
      </div>

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${meta.label} block`}
        className="mt-1.5 text-muted opacity-0 transition-opacity hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/**
 * Drag-and-drop article body editor.
 * Owns the blocks array; serializes to a hidden input so the surrounding
 * <form> server action receives it without extra client plumbing.
 */
export function BlockEditor({ initial }: { initial: Block[] }) {
  const [blocks, setBlocks] = useState<Block[]>(initial);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      setBlocks((prev) => {
        const from = prev.findIndex((b) => b.id === active.id);
        const to = prev.findIndex((b) => b.id === over.id);
        return arrayMove(prev, from, to);
      });
    }
  }

  const update = (b: Block) =>
    setBlocks((prev) => prev.map((x) => (x.id === b.id ? b : x)));
  const remove = (id: string) =>
    setBlocks((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="space-y-4">
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />

      {blocks.length === 0 && (
        <p className="glass border-dashed p-6 text-center text-sm text-muted">
          Empty article — add your first block below.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {blocks.map((b) => (
              <SortableBlock
                key={b.id}
                block={b}
                onChange={update}
                onDelete={() => remove(b.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* block palette */}
      <div className="flex flex-wrap gap-2">
        {BLOCK_TYPES.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => setBlocks((prev) => [...prev, newBlock(t.type)])}
            className="glass flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted transition-colors hover:border-violet/50 hover:text-fg"
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
