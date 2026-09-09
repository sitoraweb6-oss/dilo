const fs = require('fs');
let code = fs.readFileSync('src/components/MemberProfileModal.tsx', 'utf8');

code = code.replace(/const unsub = onSnapshot\(q, \(snap\) => \{[\s\S]*?return \(\) => unsub\(\);/, `getDocs(q).then((snap) => {
      if (isMounted) {
        const p = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
        // Sort in memory to avoid needing a composite index initially
        p.sort((a, b) => b.month.localeCompare(a.month));
        setPayments(p);
        setLoading(false);
      }
    }).catch(e => {
      console.error(e);
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };`);

code = code.replace(/const q = query\(/, `let isMounted = true;\n    const q = query(`);

fs.writeFileSync('src/components/MemberProfileModal.tsx', code);
