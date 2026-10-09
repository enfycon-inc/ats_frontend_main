"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
const Context = createContext<{ hidden: boolean; setHidden: (value: boolean) => void }>({ hidden: false, setHidden: () => {} });
export function PageHeaderProvider({ children }: { children: ReactNode }) { const [hidden, setHidden] = useState(false); return <Context.Provider value={{ hidden, setHidden }}>{children}</Context.Provider>; }
export const usePageHeader = () => useContext(Context);
