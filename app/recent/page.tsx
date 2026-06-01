import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recent Audits",
  description:
    "Locally stored audit history including merchant, platform, scan timestamp, and summary.",
};

export { default } from "./recent-client";
