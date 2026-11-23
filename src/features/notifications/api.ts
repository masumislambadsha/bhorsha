import { baseApi } from "@/store/baseApi";
import type { NotificationDto } from "./types";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    unreadCount: build.query<number, void>({
      query: () => "/notifications/unread-count",
      providesTags: [{ type: "Notification", id: "LIST" }],
    }),
    list: build.query<NotificationDto[], void>({
      query: () => "/notifications",
      providesTags: [{ type: "Notification", id: "LIST" }],
    }),
    markNotificationsRead: build.mutation<{ ok: boolean }, { ids?: string[]; all?: boolean }>({
      query: (body) => ({ url: "/notifications", method: "POST", body }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),
  }),
});

export const {
  useUnreadCountQuery,
  useListQuery: useNotificationsListQuery,
  useMarkNotificationsReadMutation,
} = notificationsApi;
