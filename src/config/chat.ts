// Live chat (Website Chat, the Slack-backed chat Pastor Eli runs).
//
// The corner bubble on the page. A visitor's message lands in the church's
// Slack channel and the answer comes back into the same chat window.
//
// The key identifies this site to the chat backend. It only permits posting into
// this church's own channel (it can't read anything), so it lives in the repo
// rather than in an env var, which keeps previews and local dev working.
// Backend site id: b083b495-1de3-48fa-aef9-01a7c71fc8a1.

export const CHAT = {
  origin: "https://slackwebsitechat.vercel.app",
  apiKey: "wbc_140afebb86ab82761bd95b93d840122a8bca0e2b4935c35c",
  accentColor: "#2a8540",
  brandColor: "#1d1b17",
  /** Pastor Eric's face, so visitors see they are writing to a person. */
  agentIcon: "/photos/pastor-face.jpg",
  greeting: "Thanks for visiting our site. Feel free to ask me anything!",
  formSubtitle: "Leave your name and a number or email and Pastor Eric will get back to you.",
  /** Line under "Chat with us" in the chat header. */
  headerSubtitle: "We will reply as soon as possible",
} as const;
