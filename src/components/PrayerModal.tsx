"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Phone from "./Phone";
import { pastor } from "@/lib/site";

export default function PrayerModal() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setTimeout(() => setStatus("idle"), 300);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setStatus("sending");
    try {
      const res = await fetch("/api/prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost time">
        Request prayer
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Prayer request"
          >
            <div className="absolute inset-0 bg-ink/70" onClick={close} />

            <div className="relative w-full max-w-lg rounded-sm border border-rule bg-paper p-7 shadow-[0_10px_24px_-10px_rgba(29,27,23,0.5)] md:p-9">
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="absolute right-4 top-4 font-sans text-[1.3rem] leading-none text-ink-soft hover:text-brick"
              >
                ×
              </button>

              {status === "success" ? (
                <div className="py-4 text-center">
                  <p className="font-display text-[1.6rem] leading-tight">Thank you.</p>
                  <p className="mt-3 text-ink-soft">
                    Your request has been sent to Pastor Eric. We&rsquo;ll be praying.
                  </p>
                  <button type="button" onClick={close} className="btn mt-6">
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <p className="kicker">How can we pray for you?</p>
                  <p className="mt-2 font-display text-[1.6rem] leading-tight">Request prayer</p>
                  <p className="mt-2 text-[1.02rem] text-ink-soft">
                    Share whatever is on your heart. Pastor Eric reads every one.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <input
                      type="checkbox"
                      name="botcheck"
                      className="hidden"
                      style={{ display: "none" }}
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                    />

                    <div>
                      <label className="font-sans text-[0.9rem] font-bold text-ink-soft">Your name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="mt-1 w-full rounded-sm border border-rule bg-paper px-3 py-2 text-ink focus:border-brick focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-sans text-[0.9rem] font-bold text-ink-soft">Your email</label>
                      <input
                        type="email"
                        name="email"
                        required
                        className="mt-1 w-full rounded-sm border border-rule bg-paper px-3 py-2 text-ink focus:border-brick focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-sans text-[0.9rem] font-bold text-ink-soft">Prayer request</label>
                      <textarea
                        name="request"
                        required
                        rows={4}
                        className="mt-1 w-full resize-none rounded-sm border border-rule bg-paper px-3 py-2 text-ink focus:border-brick focus:outline-none"
                      />
                    </div>

                    <label className="flex items-start gap-2 font-sans text-[0.92rem] text-ink-soft">
                      <input type="checkbox" name="private" className="mt-1" />
                      <span>Keep this private — for Pastor Eric only.</span>
                    </label>

                    {status === "error" && (
                      <p className="font-sans text-[0.92rem] text-brick">
                        Something went wrong sending that. Please call{" "}
                        <Phone b64={pastor.phoneB64} className="link font-bold" fallback="Pastor Eric" /> instead.
                      </p>
                    )}

                    <button type="submit" disabled={status === "sending"} className="btn w-full justify-center">
                      {status === "sending" ? "Sending…" : "Send prayer request"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
