const fs = require('fs');
let data = fs.readFileSync('app/(dashboard)/utility/users/page.tsx', 'utf8');

const regex = /useEffect\(\(\) => \{[\s\S]*?const timer = setTimeout\(async \(\) => \{[\s\S]*?const isLocallyTaken = users\.some[\s\S]*?if \(isLocallyTaken\) \{[\s\S]*?setEmailStatus\("taken"\);[\s\S]*?setEmailCheckMsg\([\s\S]*?\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?try \{[\s\S]*?const res = await fetch\([\s\S]*?\);[\s\S]*?if \(res\.ok\) \{[\s\S]*?const data = await res\.json\(\);[\s\S]*?if \(!data\.available\) \{[\s\S]*?setEmailStatus\("taken"\);[\s\S]*?setEmailCheckMsg\([\s\S]*?\);[\s\S]*?\} else \{[\s\S]*?setEmailStatus\("available"\);[\s\S]*?setEmailCheckMsg\([\s\S]*?\);[\s\S]*?\}[\s\S]*?\}[\s\S]*?\} catch \(err\) \{[\s\S]*?console\.error\("Email check failed", err\);[\s\S]*?setEmailStatus\("idle"\);[\s\S]*?\}[\s\S]*?\}, 500\);[\s\S]*?return \(\) => clearTimeout\(timer\);[\s\S]*?\}, \[addForm\.email, users\]\);/;

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
          const res = await atsApi.auth.checkEmailAvailability(rawEmail);
          if (!res.available) {
            setEmailStatus("taken");
            setEmailCheckMsg(\`Email \${rawEmail} is already registered in the system.\`);
          } else {
            setEmailStatus("available");
            setEmailCheckMsg(\`Email \${rawEmail} is available!\`);
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
