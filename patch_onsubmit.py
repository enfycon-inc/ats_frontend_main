with open('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/job-posting/components/add-client-modal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = '''
      const payload = {
        client_name: data.clientName,
        email_id: data.emailId,
        website: data.website || null,
        status: data.status,
        country: data.country,
        state: data.state || null,
        city: data.city || null,
        ownership: data.ownership,
        about_company: data.aboutCompany || null,
        commission_percentage: data.commissionPercentage || null,
        msa_signed: data.msaSigned,
        sow_executed: data.sowExecuted,
        payment_terms: data.paymentTerms || null
      };

      const res = await atsApi.clients.create(payload);
      const newClientId = res?.id || res?.data?.id;

      // If POC was added and we have the new client ID, create the contact
      if (newClientId && data.addPoc && (data.pocFirstName || data.pocLastName)) {
        try {
          const pocPhoneFull = data.pocPhoneCode && data.pocPhone ? `${data.pocPhoneCode}${data.pocPhone}` : data.pocPhone || null;
          const pocPayload = {
            name: [data.pocFirstName, data.pocLastName].filter(Boolean).join(" "),
            designation: data.pocDesignation || null,
            email: data.pocEmail || null,
            phone: pocPhoneFull,
            isPrimary: true
          };
'''

# Find the start of payload
start = code.find('const payload = {')
end = code.find('await fetch(`/api/ats/clients/${newClientId}/contacts`', start)

if start != -1 and end != -1:
    code = code[:start] + replacement + code[end:]

with open('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/job-posting/components/add-client-modal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Patched onSubmit payload")
