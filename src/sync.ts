import { loadConfig } from "./env.js";
import { todayParts } from "./date.js";
import { fetchTodaysOrders } from "./yandexMarket.js";
import { buildPagePlan } from "./aggregate.js";
import { createNotionClient, upsertDailyPage } from "./notion.js";

export async function runSync(): Promise<void> {
  const config = loadConfig();
  const dateParts = todayParts(config.tzName);

  console.log(`[sync] Ищу заказы на отгрузку ${dateParts.ddmmyyyy} (${config.tzName})...`);

  const orders = await fetchTodaysOrders({
    apiKey: config.ymApiKey,
    campaignId: config.ymCampaignId,
    shipmentDateDdMmYyyy: dateParts.ddDashMmDashYyyy,
  });

  console.log(`[sync] Найдено заказов к отгрузке: ${orders.length}`);

  const plan = buildPagePlan(orders, dateParts);
  const notion = createNotionClient(config.notionToken);
  const result = await upsertDailyPage(notion, config.notionDatabaseId, plan);

  switch (result.action) {
    case "skipped":
      console.log("[sync] Заказов нет и страницы дня ещё не существует — ничего не делаю.");
      break;
    case "created":
      console.log(`[sync] Создана страница «${plan.title}» (${result.pageId})`);
      break;
    case "updated":
      console.log(`[sync] Обновлена страница «${plan.title}» (${result.pageId})`);
      break;
  }
}
