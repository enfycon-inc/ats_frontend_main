import re

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix className
code = re.sub(
    r'className=\{ml-auto h-3 w-3 \}',
    r'className={ml-auto h-3 w-3 }',
    code
)

# Inject Dialog at the very end before the last </div>
DIALOG_CODE = '''
      {/* Add POC Dialog */}
      <Dialog open={addPocOpen} onOpenChange={setAddPocOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Add New Point of Contact</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="poc-name" className="text-xs font-bold text-neutral-700">Name <span className="text-red-500">*</span></Label>
              <Input id="poc-name" value={newPocName} onChange={e => setNewPocName(e.target.value)} className="h-8 text-xs" placeholder="e.g. Suresh Kumar" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="poc-desig" className="text-xs font-bold text-neutral-700">Designation</Label>
              <Input id="poc-desig" value={newPocDesignation} onChange={e => setNewPocDesignation(e.target.value)} className="h-8 text-xs" placeholder="e.g. HR Manager" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="poc-email" className="text-xs font-bold text-neutral-700">Email</Label>
              <Input id="poc-email" type="email" value={newPocEmail} onChange={e => setNewPocEmail(e.target.value)} className="h-8 text-xs" placeholder="suresh@company.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="poc-phone" className="text-xs font-bold text-neutral-700">Phone</Label>
              <Input id="poc-phone" value={newPocPhone} onChange={e => setNewPocPhone(e.target.value)} className="h-8 text-xs" placeholder="+91-9876543210" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddPocOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button onClick={async () => {
              if (!newPocName || !selectedClientId) return;
              try {
                const res = await fetch(/api/ats/clients//contacts, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: Bearer  },
                  body: JSON.stringify({
                    name: newPocName, designation: newPocDesignation, email: newPocEmail, phone: newPocPhone
                  })
                });
                if (res.ok) {
                  const newContact = await res.json();
                  setPocList(prev => ({ ...prev, myContacts: [newContact, ...prev.myContacts] }));
                  setSelectedPocId(newContact.id);
                  setAddPocOpen(false);
                  setNewPocName(''); setNewPocDesignation(''); setNewPocEmail(''); setNewPocPhone('');
                }
              } catch (err) {}
            }} className="h-8 text-xs" disabled={!newPocName}>Save Contact</Button>
          </div>
        </DialogContent>
      </Dialog>
'''

if 'Add New Point of Contact' not in code:
    code = code.replace(
        '<AddClientModal',
        DIALOG_CODE + '\\n\\n      <AddClientModal'
    )

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Fixed')
