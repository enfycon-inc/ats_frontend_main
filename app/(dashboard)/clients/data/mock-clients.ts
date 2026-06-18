export interface Client {
  id: string;
  clientCode: string;
  clientName: string;
  contactNumber: string;
  website: string;
  industry: string;
  state: string;
  city: string;
  status: string;
  category: string;
  primaryOwner: string;
  businessUnit: string;
  ownership: string;
  displayOnJobPosting: boolean;
  createdBy: string;
  createdOn: string;
  modifiedOn: string;
  federalId: string;
  emailId: string;
  fax: string;
  paymentTerms: string;
  address: string;
  clientLead: string;
  postalCode: string;
  country: string;
  practice: string;
  requiredDocuments: string;
  tag: string;
  clientShortName: string;
  modifiedBy: string;
  geopoliticalZone: string;
  primaryBusinessUnit: string;
  facilityManagement: string;
}

export const mockClients: Client[] = [
  {
    id: "CL-1001",
    clientCode: "CL-1001",
    clientName: "Morph Enterprise",
    contactNumber: "123-456-7890",
    website: "https://www.morphenterprise.co..",
    industry: "IT Services",
    state: "NY",
    city: "New York",
    status: "Active",
    category: "Tier 1",
    primaryOwner: "Debi Kar",
    businessUnit: "enfycon Inc",
    ownership: "Internal",
    displayOnJobPosting: true,
    createdBy: "Debi Kar",
    createdOn: "05/14/26 16:14:13",
    modifiedOn: "05/14/26 16:14:13",
    federalId: "FED-123",
    emailId: "contact@morphenterprise.com",
    fax: "N/A",
    paymentTerms: "Net 30",
    address: "123 Morph St, NY",
    clientLead: "John Doe",
    postalCode: "10001",
    country: "USA",
    practice: "Development",
    requiredDocuments: "NDA, MSA",
    tag: "Priority",
    clientShortName: "Morph",
    modifiedBy: "Debi Kar",
    geopoliticalZone: "North America",
    primaryBusinessUnit: "Software",
    facilityManagement: "N/A",
  },
  {
    id: "CL-1002",
    clientCode: "CL-1002",
    clientName: "PSCI.com",
    contactNumber: "987-654-3210",
    website: "http://www.psci.com",
    industry: "Finance",
    state: "CA",
    city: "San Francisco",
    status: "Active",
    category: "Tier 2",
    primaryOwner: "Priyaranjan Behera",
    businessUnit: "enfycon Inc",
    ownership: "Internal",
    displayOnJobPosting: true,
    createdBy: "Priyaranjan Behera",
    createdOn: "05/12/26 15:38:10",
    modifiedOn: "05/12/26 15:38:10",
    federalId: "FED-456",
    emailId: "info@psci.com",
    fax: "N/A",
    paymentTerms: "Net 45",
    address: "456 Finance Blvd, CA",
    clientLead: "Jane Smith",
    postalCode: "94105",
    country: "USA",
    practice: "Consulting",
    requiredDocuments: "MSA",
    tag: "Finance",
    clientShortName: "PSCI",
    modifiedBy: "Priyaranjan Behera",
    geopoliticalZone: "North America",
    primaryBusinessUnit: "Advisory",
    facilityManagement: "Yes",
  },
];
