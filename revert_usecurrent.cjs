const fs = require('fs');
let code = fs.readFileSync('src/lib/useCurrentMonthPayments.ts', 'utf8');

code = code.replace(/const unsub = onSnapshot\(q, \(snap\) => \{[\s\S]*?return \(\) => unsub\(\);/, `getDocs(q).then((snap) => {
      if (isMounted) {
        const payments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        setCurrentMonthPayments(payments);
      }
    }).catch(console.error);
    return () => { isMounted = false; };`);

code = code.replace(/const q = query\(/, `let isMounted = true;\n    const q = query(`);

fs.writeFileSync('src/lib/useCurrentMonthPayments.ts', code);
