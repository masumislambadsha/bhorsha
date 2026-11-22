import { baseApi } from "@/store/baseApi";
import type { MeDto } from "./types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    me: build.query<MeDto, void>({ query: () => "/me" }),
    setPin: build.mutation<void, string>({ query: (pin) => ({ url: "/me/pin", method: "POST", body: { pin } }) }),
    changePin: build.mutation<void, { currentPin: string; newPin: string }>({
      query: ({ currentPin, newPin }) => ({ url: "/me/pin", method: "PUT", body: { currentPin, newPin } }),
    }),
    updateProfile: build.mutation<void, { phone?: string; address?: string }>({
      query: (body) => ({ url: "/me/profile", method: "PATCH", body }),
    }),
  }),
});

export const { useMeQuery, useSetPinMutation, useChangePinMutation, useUpdateProfileMutation } = authApi;
