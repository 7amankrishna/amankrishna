"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { Clock, Hash, Type } from "lucide-react";
import { formatCount } from "@/lib/content/stats";
import { SITE } from "@/lib/site";

/**
 * Word count, character count and reading time under the canvas.
 *
 * Counts come from the CharacterCount extension (which walks the ProseMirror
 * doc) rather than from the serialised HTML, so they update per keystroke
 * without re-serialising the document. Reading time uses the same
 * words-per-minute constant as the public article header, so the two never
 * disagree.
 */

export function EditorStats({ editor }: { editor: Editor }) {
  const { words, characters } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      words: editor.storage.characterCount.words(),
      characters: editor.storage.characterCount.characters(),
    }),
  });

  const minutes = words ? Math.max(1, Math.round(words / SITE.readingWordsPerMinute)) : 0;

  return (
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <div className="inline-flex items-center gap-1.5">
        <Type className="size-3.5" aria-hidden />
        <dt className="sr-only">Words</dt>
        <dd>
          <span className="font-mono text-fg">{formatCount(words)}</span> words
        </dd>
      </div>
      <div className="inline-flex items-center gap-1.5">
        <Hash className="size-3.5" aria-hidden />
        <dt className="sr-only">Characters</dt>
        <dd>
          <span className="font-mono text-fg">{formatCount(characters)}</span> characters
        </dd>
      </div>
      <div className="inline-flex items-center gap-1.5">
        <Clock className="size-3.5" aria-hidden />
        <dt className="sr-only">Estimated reading time</dt>
        <dd>
          <span className="font-mono text-fg">{minutes}</span> min read
        </dd>
      </div>
    </dl>
  );
}
