"use client";

import { Provider } from "react-redux";
import { store } from "./index";

/**
 * Redux store provider for Next.js App Router
 */
export function StoreProvider({ children }) {
  return <Provider store={store}>{children}</Provider>;
}
