"use client";

import { useState, type FormEvent } from "react";

interface ContactFormProps {
  title: string;
  description: string;
  successMessage: string;
  errorMessage: string;
  submitLabel: string;
  placeholders: {
    name: string;
    email: string;
    company: string;
    message: string;
  };
}

export function ContactForm({ description, errorMessage, placeholders, submitLabel, successMessage, title }: ContactFormProps) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setState("success");
      event.currentTarget.reset();
    } catch (error) {
      console.error(error);
      setState("error");
    }
  }

  return (
    <div className="glass-card mx-auto max-w-2xl p-8">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="text-sm text-slate-600">{placeholders.name}</label>
          <input
            name="name"
            required
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none"
            placeholder={placeholders.name}
          />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">{placeholders.email}</label>
            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none"
              placeholder={placeholders.email}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">{placeholders.company}</label>
            <input
              name="company"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none"
              placeholder={placeholders.company}
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-slate-600">{placeholders.message}</label>
          <textarea
            name="message"
            rows={4}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none"
            placeholder={placeholders.message}
          />
        </div>
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(0,136,255,0.3)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {state === "loading" ? "Sending…" : submitLabel}
        </button>
        {state === "success" ? (
          <p className="text-sm text-emerald-400">{successMessage}</p>
        ) : null}
        {state === "error" ? <p className="text-sm text-rose-400">{errorMessage}</p> : null}
      </form>
    </div>
  );
}
