import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, type Locale } from "./config";

const DEFAULT_TIMEZONE = "America/New_York";
const TIMEZONE_COOKIE_NAME = "timezone";

export async function getLocaleFromCookie(): Promise<Locale> {
  const store = await cookies();
  const locale = store.get("locale")?.value ?? defaultLocale;
  return locale as Locale;
}

export async function getTimezoneFromCookie(): Promise<string> {
  const store = await cookies();
  const timezoneCookie = store.get(TIMEZONE_COOKIE_NAME)?.value;
  return timezoneCookie ?? DEFAULT_TIMEZONE;
}

export default getRequestConfig(async () => {
  const locale = await getLocaleFromCookie();

  return {
    locale,
    messages: {},
  };
});
