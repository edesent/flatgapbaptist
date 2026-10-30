"use client";

import Script from "next/script";
import { CHAT } from "@/config/chat";

/** The corner chat bubble: Website Chat, backed by Slack. */
export default function ChatWidget() {
  return (
    <Script
      id="wbc-chat"
      src={`${CHAT.origin}/widget/wbc-chat.js`}
      data-api={CHAT.origin}
      data-key={CHAT.apiKey}
      data-accent-color={CHAT.accentColor}
      data-brand-color={CHAT.brandColor}
      data-agent-icon={CHAT.agentIcon}
      data-greeting={CHAT.greeting}
      data-form-subtitle={CHAT.formSubtitle}
      data-header-subtitle={CHAT.headerSubtitle}
      data-dismiss-days="1"
      strategy="afterInteractive"
    />
  );
}
