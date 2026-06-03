import { crawlSite } from "../lib/crawler";
import { runChecks } from "../lib/checks";

async function main() {
  const url = process.argv[2] ?? "https://www.crocs.com";
  const data = await crawlSite(url);
  const { findings, platform } = runChecks(data);

  console.log("URL:", url);
  console.log("Platform:", platform);
  console.log("Entry status:", data.pages[0]?.status, data.pages[0]?.error);
  console.log("Pages crawled:", data.pages.length);
  console.log("Sitemap resource status:", data.resources.sitemapXml.status);
  console.log("Sitemap crawl info:", data.sitemap);
  console.log(
    "Successful pages:",
    data.pages.filter((page) => page.status === 200).map((page) => page.url),
  );
  console.log(
    "Detected findings:",
    findings.filter((f) => f.status === "detected").map((f) => f.id),
  );
  console.log(
    "Missing count:",
    findings.filter((f) => f.status === "missing").length,
  );
}

void main();
