import { useDispatch, useSelector, useStore } from "react-redux";
import type { Dispatch } from "redux";
import type { AppStore, RootState } from "./store";

export function useAppDispatch(): Dispatch {
  return useDispatch();
}

export function useAppSelector<T>(selector: (state: RootState) => T): T {
  return useSelector(selector);
}

export function useAppStore(): AppStore {
  return useStore() as unknown as AppStore;
}
