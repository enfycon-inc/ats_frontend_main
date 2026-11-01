"use client";
import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";
type HeaderContext = { hidden: boolean; setHidden: (value: boolean) => void; actionHost: HTMLDivElement | null; setActionHost: Dispatch<SetStateAction<HTMLDivElement | null>> };
const Context = createContext<HeaderContext>({ hidden: false, setHidden: () => {}, actionHost: null, setActionHost: () => {} });
export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [actionHost, setActionHost] = useState<HTMLDivElement | null>(null);
  return <Context.Provider value={{ hidden, setHidden, actionHost, setActionHost }}>{children}</Context.Provider>;
}
export const usePageHeader = () => useContext(Context);
