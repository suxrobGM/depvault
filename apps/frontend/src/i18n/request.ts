import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import enMessages from "../../messages/en";
import ruMessages from "../../messages/ru";
import { defaultLocale, type Locale } from "./config";

const DEFAULT_TIMEZONE = "Europe/Moscow";
const TIMEZONE_COOKIE_NAME = "timezone";

/**
 * Cached messages map to avoid creating new module instances on every request.
 * This prevents memory leaks from dynamic imports in server components.
 */
const messagesCache: Record<string, typeof enMessages> = {
  en: enMessages,
  ru: ruMessages,
};

export async function getLocaleFromCookie(): Promise<Locale> {
  const store = await cookies();
  const locale = store.get("locale")?.value ?? defaultLocale;
  return locale as Locale;
}

/**
 * Gets timezone from cookie for client-side use.
 * This is NOT used in getRequestConfig to prevent server-side memory leaks.
 */
export async function getTimezoneFromCookie(): Promise<string> {
  const store = await cookies();
  const timezoneCookie = store.get(TIMEZONE_COOKIE_NAME)?.value;
  return timezoneCookie ?? DEFAULT_TIMEZONE;
}

export default getRequestConfig(async () => {
  const locale = await getLocaleFromCookie();

  return {
    locale,
    messages: messagesCache[locale] ?? messagesCache[defaultLocale],
  };
});
