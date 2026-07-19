"use client";

import { useActionState } from "react";
import { Section, StaggerItem } from "@/components/ui/section";
import { submitContact, type ContactState } from "@/app/actions/contact";
import { SITE } from "@/lib/utils";
import { Mail, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Github, Linkedin } from "@/components/ui/brand-icons";

const channels = [
  { icon: Mail, label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
  { icon: Github, label: "GitHub", value: "github.com/7amankrishna", href: SITE.github },
  { icon: Linkedin, label: "LinkedIn", value: "in/7amankrishna", href: SITE.linkedin },
];

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-muted/60 transition-colors focus:border-violet/60 focus:outline-none";

export function Contact() {
  const [state, action, pending] = useActionState<ContactState, FormData>(
    submitContact,
    null,
  );

  return (
    <Section id="contact" eyebrow="07 — Contact" title="Build something together.">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* channels */}
        <div className="space-y-4">
          {channels.map((c) => (
            <StaggerItem key={c.label}>
              <a
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="glass flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-cyan/50"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
                  <c.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-muted">{c.label}</p>
                  <p className="font-mono text-sm">{c.value}</p>
                </div>
              </a>
            </StaggerItem>
          ))}
        </div>

        {/* form → Supabase */}
        <StaggerItem>
          <form action={action} className="g-border space-y-4 p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm text-muted">Name</span>
                <input name="name" required maxLength={100} placeholder="Your name" className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-muted">Email</span>
                <input name="email" type="email" required maxLength={200} placeholder="you@example.com" className={inputClass} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Message</span>
              <textarea
                name="message"
                required
                rows={5}
                maxLength={5000}
                placeholder="Tell me about your project or idea…"
                className={`${inputClass} resize-none`}
              />
            </label>

            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fg py-3 text-sm font-medium text-ink transition-all hover:bg-white disabled:opacity-60 sm:w-auto sm:px-8"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {pending ? "Sending…" : "Send message"}
            </button>

            {state && (
              <p
                role="status"
                className={`flex items-center gap-2 text-sm ${state.ok ? "text-cyan" : "text-red-400"}`}
              >
                {state.ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                {state.message}
              </p>
            )}
          </form>
        </StaggerItem>
      </div>
    </Section>
  );
}
