import { crawlSite } from "../lib/crawler";
import { detectPlatform } from "../lib/platform";

const urls = process.argv.slice(2);
const targets =
  urls.length > 0
    ? urls
    : [
        "https://www.carhartt.com/",
        "https://www.bang-olufsen.com/",
        "https://www.petsmart.com/",
        "https://www.lorealparisusa.com/",
      ];

async function main() {
  for (const url of targets) {
    const crawlData = await crawlSite(url);
    const platform = detectPlatform(crawlData);
    const haystack = crawlData.pages
      .map((p) => [p.htmlSnippet, p.bodyTextSnippet].join(" "))
      .join(" ");

    const ctHits = [
      "commercetools",
      "commercetools.com",
      "commerceTools",
      "composable-commerce",
      "frontastic",
      "@commercetools",
      "commercetools.io",
    ].filter((needle) => haystack.toLowerCase().includes(needle.toLowerCase()));

    console.log("\n===", url, "===");
    console.log("Detected:", platform.platform, platform.confidence);
    console.log("Evidence:", platform.evidence);
    console.log("CT string hits in crawled snippets:", ctHits.length ? ctHits : "none");
    console.log("Entry page snippet sample:", crawlData.pages[0]?.htmlSnippet?.slice(0, 500));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
