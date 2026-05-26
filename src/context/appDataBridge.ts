type NotificationsRefresher = (options?: { background?: boolean }) => Promise<void>;
type CacheResetHandler = () => void;

let notificationsRefresher: NotificationsRefresher | null = null;
let cacheResetHandler: CacheResetHandler | null = null;

export function registerNotificationsRefresher(refresher: NotificationsRefresher | null): void {
  notificationsRefresher = refresher;
}

export function registerCacheResetHandler(handler: CacheResetHandler | null): void {
  cacheResetHandler = handler;
}

export function resetAppDataCache(): void {
  cacheResetHandler?.();
}

export async function refreshNotificationsExternal(options?: { background?: boolean }): Promise<void> {
  if (!notificationsRefresher) {
    return;
  }
  await notificationsRefresher(options);
}
