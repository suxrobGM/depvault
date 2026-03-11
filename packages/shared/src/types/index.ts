export type { SortOrder, PaginationQuery, PaginationResult, PaginationInfo } from "./pagination";

/** Generic option type for select/dropdown UI components. */
export type SelectOption<T extends string = string> = { value: T; label: string };
