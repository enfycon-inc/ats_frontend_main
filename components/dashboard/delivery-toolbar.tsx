'use client';
import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
export const DeliveryToolbarContext = createContext<HTMLElement | null>(null);
export function DeliveryToolbar({ children }: { children: React.ReactNode }) {
  const target = useContext(DeliveryToolbarContext);
  return target ? createPortal(children, target) : children;
}
