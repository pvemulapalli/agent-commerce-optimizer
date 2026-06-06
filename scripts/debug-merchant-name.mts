import { crawlSite } from "../lib/crawler";
import { resolveMerchantDisplayName } from "../lib/merchant-name";

const url = process.argv[2] ?? "https://www.tokstok.com.br/";

async function main() {
  const crawl = await crawlSite(url);
  const homepage =
    crawl.pages.find((page) => {
      try {
        return (
          new URL(page.url).pathname === "/" || page.url === crawl.entryUrl
        );
      } catch {
        return false;
      }
    }) ?? crawl.pages[0];

  console.log("title:", JSON.stringify(homepage?.title));

  const ogMatch = homepage?.htmlSnippet?.match(
    /og:site_name[^>]+content=["']([^"']+)/i,
  );
  console.log("og:site_name:", JSON.stringify(ogMatch?.[1]?.slice(0, 200)));

  for (const block of homepage?.jsonLdBlocks ?? []) {
    const serialized = JSON.stringify(block);
    if (/Organization|WebSite/i.test(serialized)) {
      console.log("schema block:", serialized.slice(0, 800));
    }
  }

  const name = resolveMerchantDisplayName({
    url: crawl.entryUrl,
    crawlPages: crawl.pages.map((page) => ({
      url: page.url,
      title: page.title,
      htmlSnippet: page.htmlSnippet,
      jsonLdBlocks: page.jsonLdBlocks,
    })),
  });
  console.log("resolved:", JSON.stringify(name));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
