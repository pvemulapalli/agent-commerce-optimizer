import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recent Audits",
  description:
    "Public scan summaries for recently audited merchant domains.",
};

export { default } from "./recent-client";
