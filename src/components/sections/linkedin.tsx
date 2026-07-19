"use client";

import { Section, StaggerItem } from "@/components/ui/section";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { SITE } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { Linkedin } from "@/components/ui/brand-icons";

export function LinkedInSection() {
  return (
    <Section id="linkedin" eyebrow="06 — Network" title="Let's connect professionally.">
      <StaggerItem>
        <div className="g-border relative overflow-hidden p-8 sm:p-10">
          {/* subtle brand glow */}
          <div
            aria-hidden
            className="absolute -right-20 -top-20 size-64 rounded-full bg-blue/20 blur-3xl"
          />
          <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-blue/15 text-blue">
                <Linkedin className="size-7" />
              </span>
              <div>
                <h3 className="text-lg font-medium">{SITE.name}</h3>
                <p className="text-sm text-muted">
                  {SITE.role} · AI/ML & Full-Stack
                </p>
                <p className="mt-1 font-mono text-xs text-muted">
                  linkedin.com/in/7amankrishna
                </p>
              </div>
            </div>
            <MagneticButton href={SITE.linkedin}>
              Visit LinkedIn <ArrowUpRight className="size-4" />
            </MagneticButton>
          </div>
        </div>
      </StaggerItem>
    </Section>
  );
}
