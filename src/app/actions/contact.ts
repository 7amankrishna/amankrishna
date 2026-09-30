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
  const subject = String(formData.get("subject") ?? "").trim();

  if (!name || !email || !message) {
    return { ok: false, message: "Please fill in every field." };
  }
  if (name.length > 100 || email.length > 200 || subject.length > 200 || message.length > 5000) return { ok: false, message: "One or more fields are too long." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "That email address doesn't look right." };
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
    .insert({ name, email, subject, message });

  if (error) {
    console.error("contact insert failed:", error.message);
    return { ok: false, message: "Something went wrong — try again in a moment." };
  }
  return { ok: true, message: "Message sent. I'll get back to you soon!" };
}
