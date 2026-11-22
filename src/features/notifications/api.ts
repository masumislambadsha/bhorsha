import { baseApi } from "@/store/baseApi";
import type { NotificationDto } from "./types";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    unreadCount: build.query<number, void>({
      query: () => "/notifications/unread-count",
    }),
    list: build.query<NotificationDto[], void>({
      query: () => "/notifications",
    }),
  }),
});

export const { useUnreadCountQuery, useListQuery: useNotificationsListQuery } = notificationsApi;
