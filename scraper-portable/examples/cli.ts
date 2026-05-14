import { scrapeSite, generateReplicaPrompt } from "../src/scraper";
import { writeFileSync } from "node:fs";

const url = process.argv[2];
const format = (process.argv[3] as "prompt" | "json") ?? "prompt";
if (!url) {
  console.error("Uso: tsx examples/cli.ts <url> [prompt|json]");
  process.exit(1);
}

(async () => {
  console.log(`→ Scraping ${url}...`);
  const scrape = await scrapeSite({ url, limit: 25 });
  console.log(`✓ ${scrape.pages.length} páginas`);

  console.log(`→ Gerando ${format}...`);
  const out = await generateReplicaPrompt({ scrape, format });

  const file = format === "json" ? "replica.json" : "replica.md";
  writeFileSync(file, out.content);
  console.log(`✓ Salvo em ${file}`);
})();
