import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints.js";
import type { DateParts } from "./date.js";

export interface OrderItem {
  offerId: string;
  offerName: string;
  count: number;
}

export interface Order {
  id: number;
  items: OrderItem[];
}

export interface PagePlan {
  isoDate: string;
  title: string;
  orderCount: number;
  blocks: BlockObjectRequest[];
}

function buildBlocksForOrder(order: Order): BlockObjectRequest[] {
  const heading: BlockObjectRequest = {
    object: "block",
    type: "heading_3",
    heading_3: {
      rich_text: [{ type: "text", text: { content: `Заказ №${order.id}` } }],
    },
  };

  const items: BlockObjectRequest[] = order.items.map((item) => ({
    object: "block",
    type: "to_do",
    to_do: {
      rich_text: [
        {
          type: "text",
          text: { content: `${item.offerName} — ${item.offerId} × ${item.count}` },
        },
      ],
      checked: false,
    },
  }));

  return [heading, ...items];
}

export function buildPagePlan(orders: Order[], dateParts: DateParts): PagePlan {
  return {
    isoDate: dateParts.iso,
    title: `${dateParts.ddmmyyyy} — ${orders.length} заказов`,
    orderCount: orders.length,
    blocks: orders.flatMap(buildBlocksForOrder),
  };
}
