const fs = require('fs');
let data = fs.readFileSync('app/(dashboard)/utility/users/page.tsx', 'utf8');

const regex = /useEffect\(\(\) => \{[\s\S]*?const timer = setTimeout\(\(\) => \{[\s\S]*?const isTaken = users\.some[\s\S]*?if \(isTaken\) \{[\s\S]*?setEmailStatus\("taken"\);[\s\S]*?setEmailCheckMsg\([\s\S]*?\);[\s\S]*?\} else \{[\s\S]*?setEmailStatus\("available"\);[\s\S]*?setEmailCheckMsg\([\s\S]*?\);[\s\S]*?\}[\s\S]*?\}, 300\);[\s\S]*?return \(\) => clearTimeout\(timer\);[\s\S]*?\}, \[addForm\.email, users\]\);/;

const newUseEffect = `useEffect(() => {
      const rawEmail = (addForm?.email || "").trim().toLowerCase();
      if (!rawEmail || !rawEmail.includes("@")) {
        setEmailStatus("idle");
        setEmailCheckMsg("");
        return;
      }

      setEmailStatus("checking");
      const timer = setTimeout(async () => {
        const isLocallyTaken = users.some((u) => (u.email || "").toLowerCase() === rawEmail);
        if (isLocallyTaken) {
          setEmailStatus("taken");
          setEmailCheckMsg(\`Email \${rawEmail} is already registered in your workspace.\`);
          return;
        }

        try {
          // IMPORTANT: Must point to backend directly since /api/auth/check-email doesn't exist in Next.js routes!
          // We can use atsApi or absolute backend URL.
          const res = await fetch(\`http://localhost:5000/api/auth/check-email?email=\${encodeURIComponent(rawEmail)}\`);
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
    }, [addForm.email, users]);`;

data = data.replace(regex, newUseEffect);
fs.writeFileSync('app/(dashboard)/utility/users/page.tsx', data);
