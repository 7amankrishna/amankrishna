"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toolbar and dialog primitives for the editor.
 *
 * Deliberately dependency-free: the site already ships framer-motion and cmdk,
 * but a toolbar needs predictable focus behaviour more than it needs animation,
 * and a popover library would be a lot of bytes for three components.
 *
 * Accessibility contract:
 *   - Every icon-only control has an `aria-label` and a visible tooltip.
 *   - Toggles report state with `aria-pressed`, not colour alone.
 *   - Popovers and modals close on Escape and restore focus to their trigger.
 */

/* -------------------------------------------------------------- tooltips -- */

/**
 * Tooltip rendered from a `data-tip` attribute via CSS only, so it costs no
 * JavaScript and cannot get stuck open. `aria-label` carries the same text for
 * assistive tech, which is why the bubble itself is `aria-hidden`.
 */
function Tip({ label, shortcut }: { label: string; shortcut?: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 scale-95 whitespace-nowrap rounded-md border border-line bg-ink-2 px-2 py-1 text-xs text-fg opacity-0 shadow-lg transition-all duration-100 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
    >
      {label}
      {shortcut && <span className="ml-1.5 font-mono text-muted">{shortcut}</span>}
    </span>
  );
}

/* --------------------------------------------------------------- buttons -- */

export function ToolbarButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
  className,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      // Toolbar buttons must never submit the surrounding article form.
      aria-label={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      onClick={onClick}
      // Keeping the selection is the whole point of a formatting button.
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        "group relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors",
        "hover:bg-white/10 hover:text-fg focus-visible:bg-white/10",
        "disabled:pointer-events-none disabled:opacity-40",
        active && "bg-violet/20 text-fg",
        className,
      )}
    >
      {children}
      <Tip label={label} shortcut={shortcut} />
    </button>
  );
}

/** A labelled group of controls, visually separated from its neighbours. */
export function ToolbarGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex items-center gap-0.5", className)}
    >
      {children}
    </div>
  );
}

export function ToolbarDivider() {
  return <span aria-hidden className="mx-1 hidden h-6 w-px shrink-0 bg-line sm:block" />;
}

/* -------------------------------------------------------------- dropdown -- */

type DropdownContextValue = { close: () => void };
const DropdownContext = createContext<DropdownContextValue>({ close: () => {} });

/** Call from inside a dropdown panel to close it after picking something. */
export function useDropdown() {
  return useContext(DropdownContext);
}

export function Dropdown({
  label,
  trigger,
  children,
  align = "start",
  width = "16rem",
  disabled,
  className,
}: {
  label: string;
  /** Rendered inside the trigger button, before the chevron. */
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  width?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group relative inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-muted transition-colors",
          "hover:bg-white/10 hover:text-fg focus-visible:bg-white/10",
          "disabled:pointer-events-none disabled:opacity-40",
          open && "bg-white/10 text-fg",
          className,
        )}
      >
        {trigger}
        <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
        {!open && <Tip label={label} />}
      </button>

      {open && (
        <DropdownContext.Provider value={{ close }}>
          <div
            id={panelId}
            role="dialog"
            aria-label={label}
            style={{ width }}
            className={cn(
              "glass absolute top-full z-40 mt-1.5 max-h-80 overflow-y-auto p-1.5 shadow-2xl",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {children}
          </div>
        </DropdownContext.Provider>
      )}
    </div>
  );
}

/** A row inside a dropdown panel. */
export function DropdownItem({
  active,
  onClick,
  children,
  className,
  style,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { close } = useDropdown();
  return (
    <button
      type="button"
      aria-pressed={active ?? undefined}
      style={style}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        onClick();
        close();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-muted transition-colors",
        "hover:bg-white/10 hover:text-fg focus-visible:bg-white/10",
        active && "bg-violet/20 text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted/70">
      {children}
    </p>
  );
}

/* ----------------------------------------------------------------- modal -- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    // Focus the panel so Escape and Tab start inside the dialog.
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;

      // Minimal focus trap: cycle within the panel's focusable children.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/80 p-4 backdrop-blur-sm sm:items-center">
      <div
        aria-hidden
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "glass relative my-auto w-full p-5 shadow-2xl focus:outline-none",
          size === "lg" ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/10 hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- field -- */

export const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/60 focus:border-violet/60 focus:outline-none";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3 text-sm text-muted">
        <span>{label}</span>
        {hint}
      </span>
      {children}
    </label>
  );
}
