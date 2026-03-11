"use client";

import { client } from "@/lib/api";
import type { NotificationType } from "@/types/api/notification";
import { useApiMutation } from "./use-api-mutation";
import { useApiQuery } from "./use-api-query";

interface NotificationFilters {
  type?: NotificationType;
  read?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Fetches notifications with optional filtering by type and read status, and supports pagination.
 */
export function useNotifications(filters?: NotificationFilters) {
  return useApiQuery(["notifications", "list", filters], () =>
    client.api.notifications.get({
      query: {
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 20,
        ...(filters?.type && { type: filters.type as NotificationType }),
        ...(filters?.read !== undefined && { read: filters.read }),
      },
    }),
  );
}

/**
 * Fetches the count of unread notifications,
 * with automatic refetching every 45 seconds and a stale time of 30 seconds.
 */
export function useUnreadCount() {
  return useApiQuery(
    ["notifications", "unread-count"],
    () => client.api.notifications["unread-count"].get(),
    { refetchInterval: 45_000, staleTime: 30_000 },
  );
}

/**
 * Marks a single notification as read by its ID, with automatic invalidation of the notifications list query.
 */
export function useMarkRead() {
  return useApiMutation(
    (notificationId: string) => client.api.notifications({ notificationId }).read.patch(),
    { invalidateKeys: [["notifications"]] },
  );
}

/**
 * Marks all notifications as read, with automatic invalidation of the notifications list query.
 */
export function useMarkAllRead() {
  return useApiMutation(() => client.api.notifications["read-all"].patch(), {
    invalidateKeys: [["notifications"]],
  });
}

/**
 * Deletes a notification by its ID, with automatic invalidation of the notifications list query.
 */
export function useDeleteNotification() {
  return useApiMutation(
    (notificationId: string) => client.api.notifications({ notificationId }).delete(),
    { invalidateKeys: [["notifications"]] },
  );
}
