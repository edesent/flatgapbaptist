"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { EDITOR } from "./config";

// Its own chunk: visitors who never open /edit never download the editor.
const Editor = dynamic(() => import("./Editor").then((m) => m.Editor), { ssr: false });

/** Opening /edit switches editing on for the rest of that tab, so every page can be edited. */
const FLAG = `${EDITOR.storagePrefix}-editing`;
const EVENT = `${EDITOR.storagePrefix}-editing-change`;

function readFlag() {
  try {
    return sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}
function writeFlag(on: boolean) {
  try {
    if (on) sessionStorage.setItem(FLAG, "1");
    else sessionStorage.removeItem(FLAG);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function EditGate() {
  const pathname = usePathname();
  const atEdit = pathname === "/edit";
  const flagged = useSyncExternalStore(subscribe, readFlag, () => false);

  useEffect(() => {
    if (atEdit) writeFlag(true);
  }, [atEdit]);

  // Exit reloads with ?fresh=… so nothing stale is reused; take it back off the address.
  useEffect(() => {
    const url = new URL(location.href);
    if (!url.searchParams.has("fresh")) return;
    url.searchParams.delete("fresh");
    history.replaceState(history.state, "", url);
  }, []);

  // The visitor numbers page shares the sign-in but is not an editable page.
  if ((!atEdit && !flagged) || pathname?.startsWith("/analytics")) return null;
  return (
    <Editor
      onClose={() => {
        writeFlag(false);
        // A full, cache-busting load: no editor, no unpublished text, no in-app page cache.
        location.assign(`${atEdit ? "/" : location.pathname}?fresh=${Date.now()}`);
      }}
    />
  );
}
