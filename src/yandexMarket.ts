const BASE_URL = "https://api.partner.market.yandex.ru/v2";
const MAX_PAGE_SIZE = 50;
const MAX_RETRY_ATTEMPTS = 5;

export interface YmOrderItem {
  offerId: string;
  offerName: string;
  count: number;
}

export interface YmOrder {
  id: number;
  items: YmOrderItem[];
}

export interface FetchTodaysOrdersParams {
  apiKey: string;
  campaignId: string;
  /** DD-MM-YYYY, требуемый Partner API формат для supplierShipmentDateFrom/To */
  shipmentDateDdMmYyyy: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry(url: URL, apiKey: string): Promise<Response> {
  let attempt = 0;

  while (true) {
    attempt += 1;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "Api-Key": apiKey },
      });
    } catch (error) {
      throw new Error(
        `Не удалось подключиться к Partner API Яндекс Маркета: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if ((response.status === 420 || response.status === 429) && attempt <= MAX_RETRY_ATTEMPTS) {
      const retryAfterHeader = Number(response.headers.get("retry-after"));
      const waitSeconds = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader : attempt * 2;
      console.log(
        `[yandexMarket] Получен статус ${response.status}, повтор через ${waitSeconds} сек (попытка ${attempt}/${MAX_RETRY_ATTEMPTS})...`
      );
      await sleep(waitSeconds * 1000);
      continue;
    }

    return response;
  }
}

export async function fetchTodaysOrders(params: FetchTodaysOrdersParams): Promise<YmOrder[]> {
  const { apiKey, campaignId, shipmentDateDdMmYyyy } = params;
  const orders: YmOrder[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${BASE_URL}/campaigns/${campaignId}/orders`);
    url.searchParams.set("status", "PROCESSING");
    url.searchParams.set("supplierShipmentDateFrom", shipmentDateDdMmYyyy);
    url.searchParams.set("supplierShipmentDateTo", shipmentDateDdMmYyyy);
    url.searchParams.set("limit", String(MAX_PAGE_SIZE));
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await requestWithRetry(url, apiKey);

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Partner API отклонил токен (статус ${response.status}). Проверьте YM_API_KEY и YM_CAMPAIGN_ID.`
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Partner API вернул ошибку ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      orders?: Array<{
        id: number;
        items?: Array<{ offerId: string; offerName: string; count: number }>;
      }>;
      paging?: { nextPageToken?: string };
    };

    for (const order of data.orders ?? []) {
      orders.push({
        id: order.id,
        items: (order.items ?? []).map((item) => ({
          offerId: item.offerId,
          offerName: item.offerName,
          count: item.count,
        })),
      });
    }

    pageToken = data.paging?.nextPageToken;
  } while (pageToken);

  return orders;
}
