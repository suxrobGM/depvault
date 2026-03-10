import type { client } from "@/lib/api";
import type { Data } from "./utils";

type NotificationsEndpoint = (typeof client)["api"]["notifications"];

export type NotificationListResponse = Data<NotificationsEndpoint["get"]>;
export type Notification = NotificationListResponse["items"][number];

type UnreadCountEndpoint = NotificationsEndpoint["unread-count"];
export type UnreadCountResponse = Data<UnreadCountEndpoint["get"]>;

export type NotificationType = Notification["type"];
