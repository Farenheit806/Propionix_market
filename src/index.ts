import { runSync } from "./sync.js";

runSync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[sync] Фатальная ошибка: ${message}`);
  process.exitCode = 1;
});
