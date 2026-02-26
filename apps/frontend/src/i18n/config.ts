export const locales = ["en", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
};

export const localeFlags: Record<Locale, { src: string; alt: string }> = {
  en: { src: "/images/lang/usa.png", alt: "USA" },
  ru: { src: "/images/lang/russian.png", alt: "Russia" },
};
