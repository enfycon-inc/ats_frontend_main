"use client";

import { ClientForm } from '@/components/clients/client-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { CreatedClient } from '@/lib/client-creation-contract';

interface AddClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientAdded: (clientName: string, client: CreatedClient) => void | Promise<void>;
  market?: 'US' | 'IN';
  initialClientName?: string;
}

export function AddClientModal({ open, onOpenChange, onClientAdded, market, initialClientName = '' }: AddClientModalProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle className="text-lg font-bold">Add Client</DialogTitle>
        <DialogDescription>Create a company account. Select its role as client or end client on the job.</DialogDescription>
      </DialogHeader>
      {open && <ClientForm initialClientName={initialClientName} expectedMarket={market === 'IN' ? 'INDIA' : market}
        onCancel={() => onOpenChange(false)} onSaved={async client => {
          await onClientAdded(client.client_name, client);
          onOpenChange(false);
        }} />}
    </DialogContent>
  </Dialog>;
}
