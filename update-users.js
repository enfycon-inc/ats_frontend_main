const fs = require('fs');
let data = fs.readFileSync('app/(dashboard)/utility/users/page.tsx', 'utf8');

const oldUseEffect = `
    useEffect(() => {
      const rawEmail = (addForm?.email || "").trim().toLowerCase();
      if (!rawEmail || !rawEmail.includes("@")) {
        setEmailStatus("idle");
        setEmailCheckMsg("");
        return;
      }

      setEmailStatus("checking");
      const timer = setTimeout(() => {
        const isTaken = users.some((u) => (u.email || "").toLowerCase() === rawEmail);

        if (isTaken) {
          setEmailStatus("taken");
          setEmailCheckMsg(\`Email \${rawEmail} is already registered.\`);
        } else {
          setEmailStatus("available");
          setEmailCheckMsg(\`Email \${rawEmail} is available!\`);
        }
      }, 300);

      return () => clearTimeout(timer);
    }, [addForm.email, users]);
`.trim();

const newUseEffect = `
    useEffect(() => {
      const rawEmail = (addForm?.email || "").trim().toLowerCase();
      if (!rawEmail || !rawEmail.includes("@")) {
        setEmailStatus("idle");
        setEmailCheckMsg("");
        return;
      }

      setEmailStatus("checking");
      const timer = setTimeout(async () => {
        // First check locally to save network calls
        const isLocallyTaken = users.some((u) => (u.email || "").toLowerCase() === rawEmail);
        if (isLocallyTaken) {
          setEmailStatus("taken");
          setEmailCheckMsg(\`Email \${rawEmail} is already registered in your workspace.\`);
          return;
        }

        // Then check globally via API
        try {
          const res = await fetch(\`/api/auth/check-email?email=\${encodeURIComponent(rawEmail)}\`);
          if (res.ok) {
            const data = await res.json();
            if (!data.available) {
              setEmailStatus("taken");
              setEmailCheckMsg(\`Email \${rawEmail} is already registered in the system.\`);
            } else {
              setEmailStatus("available");
              setEmailCheckMsg(\`Email \${rawEmail} is available!\`);
            }
          }
        } catch (err) {
          console.error("Email check failed", err);
          setEmailStatus("idle");
        }
      }, 500);

      return () => clearTimeout(timer);
    }, [addForm.email, users]);
`.trim();

data = data.replace(oldUseEffect, newUseEffect);
fs.writeFileSync('app/(dashboard)/utility/users/page.tsx', data);
