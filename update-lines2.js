const fs = require('fs');
const lines = fs.readFileSync('app/(dashboard)/utility/users/page.tsx', 'utf8').split('\n');

const newUseEffect = `  useEffect(() => {
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

const targetIndex = lines.findIndex(l => l.includes('}, [addForm.email, users]);'));
if (targetIndex === -1) { console.error('Could not find target'); process.exit(1); }

let start = targetIndex;
while(start > 0 && !lines[start].includes('useEffect(() => {')) start--;

let end = targetIndex;

lines.splice(start, end - start + 1, newUseEffect);

fs.writeFileSync('app/(dashboard)/utility/users/page.tsx', lines.join('\n'));
