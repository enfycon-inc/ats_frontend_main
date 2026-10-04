with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

injection = '''
      {/* Add End POC Dialog */}
      <Dialog open={addEndPocOpen} onOpenChange={setAddEndPocOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Add New End Client Contact</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="end-poc-name" className="text-xs font-bold text-neutral-700">Name <span className="text-red-500">*</span></Label>
              <Input id="end-poc-name" value={newEndPocName} onChange={e => setNewEndPocName(e.target.value)} className="h-8 text-xs" placeholder="e.g. Suresh Kumar" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-poc-desig" className="text-xs font-bold text-neutral-700">Designation</Label>
              <Input id="end-poc-desig" value={newEndPocDesignation} onChange={e => setNewEndPocDesignation(e.target.value)} className="h-8 text-xs" placeholder="e.g. HR Manager" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-poc-email" className="text-xs font-bold text-neutral-700">Email</Label>
              <Input id="end-poc-email" type="email" value={newEndPocEmail} onChange={e => setNewEndPocEmail(e.target.value)} className="h-8 text-xs" placeholder="suresh@company.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-poc-phone" className="text-xs font-bold text-neutral-700">Phone</Label>
              <Input id="end-poc-phone" value={newEndPocPhone} onChange={e => setNewEndPocPhone(e.target.value)} className="h-8 text-xs" placeholder="+91-9876543210" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddEndPocOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button onClick={async () => {
              if (!newEndPocName || !selectedEndClientId) return;
              try {
                const res = await fetch(`/api/ats/clients/${selectedEndClientId}/contacts`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(window as any).__ats_token || ''}` },
                  body: JSON.stringify({
                    name: newEndPocName, designation: newEndPocDesignation, email: newEndPocEmail, phone: newEndPocPhone
                  })
                });
                if (res.ok) {
                  const newContact = await res.json();
                  setEndPocList(prev => ({ ...prev, myContacts: [newContact, ...prev.myContacts] }));
                  setSelectedEndPocId(newContact.id);
                  setAddEndPocOpen(false);
                  setNewEndPocName(''); setNewEndPocDesignation(''); setNewEndPocEmail(''); setNewEndPocPhone('');
                }
              } catch (err) {
                console.error("Failed to add end POC", err);
              }
            }} className="h-8 text-xs" disabled={!newEndPocName}>
              Save Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>
'''

code = code.replace('      {/* Add POC Dialog */}', injection + '      {/* Add POC Dialog */}')

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Added End POC Dialog")
