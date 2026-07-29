"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { InterfaceContentMap } from "@/lib/interface-content/contracts";

const InterfaceContentContext = createContext<InterfaceContentMap>({});

export function InterfaceContentProvider({ content, children }: { content: InterfaceContentMap; children: ReactNode }) {
  return <InterfaceContentContext.Provider value={content}>{children}</InterfaceContentContext.Provider>;
}

export function useInterfaceContent() {
  return useContext(InterfaceContentContext);
}
