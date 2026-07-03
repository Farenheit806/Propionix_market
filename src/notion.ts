import { Client } from "@notionhq/client";
import type {
  CreatePageParameters,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints.js";
import type { PagePlan } from "./aggregate.js";

type PageProperties = CreatePageParameters["properties"] & UpdatePageParameters["properties"];

const APPEND_CHUNK_SIZE = 100;

export function createNotionClient(token: string): Client {
  return new Client({ auth: token });
}

export type UpsertResult =
  | { action: "skipped" }
  | { action: "created"; pageId: string }
  | { action: "updated"; pageId: string };

async function findPageIdByDate(
  notion: Client,
  databaseId: string,
  isoDate: string
): Promise<string | undefined> {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Date",
      date: { equals: isoDate },
    },
  });

  return response.results[0]?.id;
}

interface DatabaseSchemaInfo {
  titlePropertyName: string;
  hasOrdersNumberProperty: boolean;
}

async function getDatabaseSchemaInfo(notion: Client, databaseId: string): Promise<DatabaseSchemaInfo> {
  const database = await notion.databases.retrieve({ database_id: databaseId });
  const properties = (database as { properties?: Record<string, { type?: string }> }).properties ?? {};

  const titlePropertyName = Object.entries(properties).find(([, value]) => value.type === "title")?.[0];
  if (!titlePropertyName) {
    throw new Error(`В базе данных Notion (${databaseId}) не найдено свойство типа "title".`);
  }

  return {
    titlePropertyName,
    hasOrdersNumberProperty: properties.Orders?.type === "number",
  };
}

function buildProperties(plan: PagePlan, schema: DatabaseSchemaInfo): PageProperties {
  const properties: PageProperties = {
    [schema.titlePropertyName]: {
      title: [{ type: "text", text: { content: plan.title } }],
    },
    Date: {
      date: { start: plan.isoDate },
    },
  };

  if (schema.hasOrdersNumberProperty) {
    properties.Orders = { number: plan.orderCount };
  }

  return properties;
}

async function clearChildren(notion: Client, pageId: string): Promise<void> {
  const blockIds: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });
    blockIds.push(...response.results.map((block) => block.id));
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  for (const blockId of blockIds) {
    await notion.blocks.delete({ block_id: blockId });
  }
}

async function appendChildrenInBatches(
  notion: Client,
  pageId: string,
  blocks: PagePlan["blocks"]
): Promise<void> {
  for (let i = 0; i < blocks.length; i += APPEND_CHUNK_SIZE) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: blocks.slice(i, i + APPEND_CHUNK_SIZE),
    });
  }
}

export async function upsertDailyPage(
  notion: Client,
  databaseId: string,
  plan: PagePlan
): Promise<UpsertResult> {
  const existingPageId = await findPageIdByDate(notion, databaseId, plan.isoDate);

  if (plan.orderCount === 0 && !existingPageId) {
    return { action: "skipped" };
  }

  const schema = await getDatabaseSchemaInfo(notion, databaseId);
  const properties = buildProperties(plan, schema);

  let pageId = existingPageId;
  if (pageId) {
    await notion.pages.update({ page_id: pageId, properties });
    await clearChildren(notion, pageId);
  } else {
    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    });
    pageId = page.id;
  }

  await appendChildrenInBatches(notion, pageId, plan.blocks);

  return existingPageId ? { action: "updated", pageId } : { action: "created", pageId };
}
