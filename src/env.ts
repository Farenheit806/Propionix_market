import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(): void {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

export interface Config {
  ymApiKey: string;
  ymCampaignId: string;
  notionToken: string;
  notionDatabaseId: string;
  tzName: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Не задана переменная окружения ${name}. Проверьте .env локально или secrets в GitHub Actions.`
    );
  }
  return value;
}

export function loadConfig(): Config {
  return {
    ymApiKey: required("YM_API_KEY"),
    ymCampaignId: required("YM_CAMPAIGN_ID"),
    notionToken: required("NOTION_TOKEN"),
    notionDatabaseId: required("NOTION_DATABASE_ID"),
    tzName: process.env.TZ_NAME || "Europe/Moscow",
  };
}
