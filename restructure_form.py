import re

for form_file in ['IndiaStaffingForm.tsx']:
    path = f'app/(dashboard)/job-posting/new/{form_file}'
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # 1. Add selectedClientId state and poc states right after countryOpen state
    old_state = 'const [cityOpen, setCityOpen] = useState(false);'
    new_state = '''const [cityOpen, setCityOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [pocList, setPocList] = useState<{ myContacts: any[]; otherContacts: any[] }>({ myContacts: [], otherContacts: [] });
  const [pocOpen, setPocOpen] = useState(false);
  const [pocSearch, setPocSearch] = useState('');
  const [selectedPocId, setSelectedPocId] = useState<string | null>(null);
  const [addPocOpen, setAddPocOpen] = useState(false);
  const [newPocName, setNewPocName] = useState('');
  const [newPocDesignation, setNewPocDesignation] = useState('');
  const [newPocEmail, setNewPocEmail] = useState('');
  const [newPocPhone, setNewPocPhone] = useState('');'''
    code = code.replace(old_state, new_state)
    
    # 2. Auto-fill commission when client is selected  
    old_client_select = 'setValue("client", clientNameStr, { shouldValidate: true });\n                                            setClientDropdownOpen(false);\n                                            setClientSearchText("");'
    new_client_select = '''setValue("client", clientNameStr, { shouldValidate: true });
                                            setClientDropdownOpen(false);
                                            setClientSearchText("");
                                            // Auto-fill commission & load POCs
                                            const found = clientList.find((c: any) => (c.client_name || c.clientName || c.name || '') === clientNameStr);
                                            if (found) {
                                              setSelectedClientId(found.id);
                                              if (found.commissionPercentage || found.commission_percentage) {
                                                const pct = found.commissionPercentage || found.commission_percentage;
                                                setCommissionType(String(pct));
                                              }
                                              // Load POCs
                                              fetch(/api/ats/clients//contacts, { headers: { Authorization: Bearer  } })
                                                .then(r => r.json()).then(data => setPocList(data)).catch(() => {});
                                            }'''
    code = code.replace(old_client_select, new_client_select, 1)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)

print('Form restructured.')
