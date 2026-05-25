import { router, type Href } from 'expo-router';

export function safeBack(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}

export function resolveRouteParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
