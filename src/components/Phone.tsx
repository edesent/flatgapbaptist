"use client";

import { useEffect, useState } from "react";
import { church } from "@/lib/site";

/**
 * A phone number (the church line unless `b64` says otherwise), put together in the browser after the page loads so it
 * never sits in the HTML for spam scrapers to harvest.
 */
export default function Phone({
  className = "",
  fallback = "Call the church",
  text = false,
  label,
  b64 = church.phoneB64,
}: {
  className?: string;
  fallback?: string;
  /** Link to a text message instead of a call. */
  text?: boolean;
  /** Show this instead of the formatted number. */
  label?: string;
  /** A different number, base64'd. Defaults to the church line. */
  b64?: string;
}) {
  const [digits, setDigits] = useState<string | null>(null);

  useEffect(() => {
    setDigits(atob(b64));
  }, [b64]);

  if (!digits) return <span className={className}>{label ?? fallback}</span>;

  const pretty = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return (
    <a href={`${text ? "sms" : "tel"}:+1${digits}`} className={className}>
      {label ?? pretty}
    </a>
  );
}
