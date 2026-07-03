import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPagePlan, type Order } from "../src/aggregate.js";
import type { DateParts } from "../src/date.js";

const dateParts: DateParts = {
  iso: "2026-07-03",
  ddmmyyyy: "03.07.2026",
  ddDashMmDashYyyy: "03-07-2026",
};

function heading3Text(block: any): string {
  return block.heading_3.rich_text[0].text.content;
}

function toDoText(block: any): string {
  return block.to_do.rich_text[0].text.content;
}

test("без заказов возвращает нулевой заголовок и пустые блоки", () => {
  const plan = buildPagePlan([], dateParts);

  assert.equal(plan.isoDate, "2026-07-03");
  assert.equal(plan.title, "03.07.2026 — 0 заказов");
  assert.equal(plan.orderCount, 0);
  assert.deepEqual(plan.blocks, []);
});

test("один заказ с несколькими позициями даёт заголовок и чеклист", () => {
  const orders: Order[] = [
    {
      id: 12345,
      items: [
        { offerId: "SKU-1", offerName: "Товар А", count: 2 },
        { offerId: "SKU-2", offerName: "Товар Б", count: 1 },
      ],
    },
  ];

  const plan = buildPagePlan(orders, dateParts);

  assert.equal(plan.title, "03.07.2026 — 1 заказов");
  assert.equal(plan.orderCount, 1);
  assert.equal(plan.blocks.length, 3);

  assert.equal(plan.blocks[0].type, "heading_3");
  assert.equal(heading3Text(plan.blocks[0]), "Заказ №12345");

  assert.equal(plan.blocks[1].type, "to_do");
  assert.equal(toDoText(plan.blocks[1]), "Товар А — SKU-1 × 2");
  assert.equal((plan.blocks[1] as any).to_do.checked, false);

  assert.equal(plan.blocks[2].type, "to_do");
  assert.equal(toDoText(plan.blocks[2]), "Товар Б — SKU-2 × 1");
});

test("несколько заказов идут друг за другом со своими заголовками", () => {
  const orders: Order[] = [
    { id: 1, items: [{ offerId: "A", offerName: "Первый", count: 1 }] },
    { id: 2, items: [{ offerId: "B", offerName: "Второй", count: 3 }] },
  ];

  const plan = buildPagePlan(orders, dateParts);

  assert.equal(plan.title, "03.07.2026 — 2 заказов");
  assert.equal(plan.blocks.length, 4);
  assert.equal(heading3Text(plan.blocks[0]), "Заказ №1");
  assert.equal(toDoText(plan.blocks[1]), "Первый — A × 1");
  assert.equal(heading3Text(plan.blocks[2]), "Заказ №2");
  assert.equal(toDoText(plan.blocks[3]), "Второй — B × 3");
});
