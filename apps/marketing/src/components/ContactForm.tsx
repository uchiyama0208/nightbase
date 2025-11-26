"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ContactContent } from "@/content/types";

interface ContactFormProps {
  content: ContactContent;
}

export function ContactForm({ content }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="glass-panel space-y-6 p-8">
      <h2 className="text-2xl font-semibold text-[#111111]">{content.title}</h2>
      <p className="text-sm text-neutral-500">{content.description}</p>
      {submitted ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-sm text-primary">
          {content.successMessage}
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          {content.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <label htmlFor={field.name} className="text-sm font-medium text-neutral-600">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  required
                  placeholder={field.placeholder}
                  className="min-h-[140px] w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  required
                  placeholder={field.placeholder}
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              )}
            </div>
          ))}
          <p className="text-xs text-neutral-400">{content.privacy}</p>
          <Button type="submit" className="w-full">
            {content.submitLabel}
          </Button>
        </form>
      )}
    </div>
  );
}
