import "dotenv/config";
import { runScrape } from "./scrape.mjs";

async function main() {
  const [, , searchTerm, city, maxLeadsArg] = process.argv;
  if (!searchTerm || !city || !maxLeadsArg) {
    console.error('Usage: node index.mjs "<searchTerm>" "<city>" <maxLeads>');
    process.exit(1);
  }
  const maxLeads = parseInt(maxLeadsArg, 10);
  if (!Number.isFinite(maxLeads) || maxLeads <= 0) {
    console.error("maxLeads must be a positive integer");
    process.exit(1);
  }

  try {
    const leads = await runScrape(searchTerm, city, maxLeads);
    process.stdout.write(JSON.stringify(leads, null, 2) + "\n");
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
