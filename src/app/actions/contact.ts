"use server";

import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export type ContactState = {
  ok: boolean;
  message: string;
} | null;

/** Store a contact-form submission in Supabase `contact_messages`. */
export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { ok: false, message: "Please fill in every field." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "That email address doesn't look right." };
  }
  if (message.length > 5000) {
    return { ok: false, message: "Message is too long (5000 characters max)." };
  }

  if (!supabaseConfigured()) {
    // Graceful degradation before Supabase is wired up.
    return {
      ok: false,
      message: "Contact form isn't connected yet — email me directly instead.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .insert({ name, email, message });

  if (error) {
    console.error("contact insert failed:", error.message);
    return { ok: false, message: "Something went wrong — try again in a moment." };
  }
  return { ok: true, message: "Message sent. I'll get back to you soon!" };
}
