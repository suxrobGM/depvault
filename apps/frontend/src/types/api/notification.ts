import type { client } from "@/lib/api";
import type { Data } from "./utils";

type NotificationsEndpoint = typeof client.api.notifications;

export type NotificationListResponseDto = Data<NotificationsEndpoint["get"]>;
export type NotificationDto = NotificationListResponseDto["items"][number];

type UnreadCountEndpoint = NotificationsEndpoint["unread-count"];
export type UnreadCountDto = Data<UnreadCountEndpoint["get"]>;

export type NotificationType = NotificationDto["type"];
