import type { Data } from "@depvault/shared/api";
import type { client } from "@/api/client";

type NotificationsEndpoint = typeof client.api.notifications;

export type NotificationListResponseDto = Data<NotificationsEndpoint["get"]>;
export type NotificationDto = NotificationListResponseDto["items"][number];

type UnreadCountEndpoint = NotificationsEndpoint["unread-count"];
export type UnreadCountDto = Data<UnreadCountEndpoint["get"]>;

export type NotificationType = NotificationDto["type"];
