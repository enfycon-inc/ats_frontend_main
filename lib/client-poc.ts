export interface ClientPoc {
  name?: string | null;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
}

export function resolveClientPoc(client: Record<string, any>, contacts?: {
  myContacts?: ClientPoc[];
  otherContacts?: ClientPoc[];
} | null): ClientPoc {
  const all = [...(contacts?.myContacts || []), ...(contacts?.otherContacts || [])];
  const selected = all.find(contact => contact.isPrimary) || all[0];
  // Keep all fields from one contact; missing fields must not borrow another person's data.
  return selected || {
    name: client.contact_person || client.client_lead,
    designation: client.contact_designation,
    email: client.email_id,
    phone: client.contact_number,
  };
}
