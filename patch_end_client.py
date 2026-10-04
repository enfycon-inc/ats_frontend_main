import re

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

s = code.find('const [selectedEndPocId, setSelectedEndPocId] = useState<string | null>(null);')
if s != -1:
    e = code.find('\n', s)
    # Add end client id and end poc list
    injection = '''
  const [selectedEndClientId, setSelectedEndClientId] = useState<string | null>(null);
  const [endPocList, setEndPocList] = useState<{myContacts: any[], otherContacts: any[]}>({ myContacts: [], otherContacts: [] });
  const [addEndPocOpen, setAddEndPocOpen] = useState(false);
  const [newEndPocName, setNewEndPocName] = useState("");
  const [newEndPocDesignation, setNewEndPocDesignation] = useState("");
  const [newEndPocEmail, setNewEndPocEmail] = useState("");
  const [newEndPocPhone, setNewEndPocPhone] = useState("");

  useEffect(() => {
    if (!selectedEndClientId) {
      setEndPocList({ myContacts: [], otherContacts: [] });
      setSelectedEndPocId(null);
      return;
    }
    const fetchEndPocs = async () => {
      try {
        const res = await fetch(/api/ats/clients/\/contacts, {
          headers: { Authorization: Bearer \ }
        });
        if (res.ok) {
          const data = await res.json();
          const me = session?.user?.email || "me";
          const mine = data.filter((p: any) => p.created_by_email === me || p.createdByEmail === me);
          const others = data.filter((p: any) => p.created_by_email !== me && p.createdByEmail !== me);
          setEndPocList({ myContacts: mine, otherContacts: others });
        }
      } catch (err) {
        console.error("Failed to fetch end POCs", err);
      }
    };
    fetchEndPocs();
  }, [selectedEndClientId, session?.user?.email]);
'''
    code = code[:e] + '\n' + injection + code[e:]

# Now replace where endClientName is set to also set selectedEndClientId
code = code.replace(
    'setValue("endClientName", clientNameStr, { shouldValidate: true });',
    'setValue("endClientName", clientNameStr, { shouldValidate: true });\n                                      if (exactMatch.id) setSelectedEndClientId(exactMatch.id); else if (cl?.id) setSelectedEndClientId(cl.id);'
)

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Patched End Client Id")
