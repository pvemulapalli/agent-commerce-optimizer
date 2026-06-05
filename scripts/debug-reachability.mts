import { validateDomainReachability } from "../lib/domain-reachability";
import { runAudit } from "../lib/run-audit";

const url = process.argv[2] ?? "https://about---blank.com/";

async function main() {
  try {
    await validateDomainReachability(url);
    console.log("reachability: OK");
  } catch (error) {
    console.log(
      "reachability failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
  }

  try {
    const result = await runAudit(url);
    console.log("audit:", result.cacheStatus, "url:", result.url);
    console.log("platform:", result.platform.platform, result.platform.confidence);
  } catch (error) {
    console.log(
      "audit failed:",
      error instanceof Error ? `${error.name}: ${error.message.slice(0, 200)}` : error,
    );
  }
}

main();
