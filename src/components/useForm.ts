"use client";

import { useCallback, useEffect, useState } from "react";

export type FormKind = "prayer" | "contact";

/** Fetches a signed load-time token and posts a form to /api/form. */
export function useForm(kind: FormKind) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/form", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setToken(d.token ?? ""))
      .catch(() => {});
  }, []);

  const submit = useCallback(
    async (fields: Record<string, unknown>) => {
      setStatus("sending");
      setError("");
      try {
        const res = await fetch("/api/form", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...fields, kind, token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Something went wrong. Please call the church.");
          setStatus("error");
          return;
        }
        setStatus("sent");
      } catch {
        setError("We couldn’t reach the server. Please call the church.");
        setStatus("error");
      }
    },
    [kind, token],
  );

  return { submit, status, error };
}
