const fs = require('fs');

let file = fs.readFileSync('src/pages/tabs/MembersTab.tsx', 'utf8');

const queryOld = `        const [membersSnap, paymentsSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'payments'), where('month', '==', currentMonth)))
        ]);
        
        if (!isMounted) return;
        
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));`;

const queryNew = `        const q1 = query(collection(db, 'payments'), where('month', '==', currentMonth));
        const q2 = query(collection(db, 'payments'), where('coveredMonthsList', 'array-contains', currentMonth));
        const [membersSnap, snap1, snap2] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
          getDocs(q1),
          getDocs(q2)
        ]);
        
        if (!isMounted) return;
        
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        const paymentsMap = new Map();
        snap1.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
        snap2.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
        setPayments(Array.from(paymentsMap.values()));`;

file = file.replace(queryOld, queryNew);

file = file.replace(
  "getMemberStatus(m, payments.filter(p => p.month === currentMonth))",
  "getMemberStatus(m, payments, currentMonth)"
);

file = file.replace(
  "getMemberStatus(a, payments.filter(p => p.month === currentMonth))",
  "getMemberStatus(a, payments, currentMonth)"
);

file = file.replace(
  "getMemberStatus(b, payments.filter(p => p.month === currentMonth))",
  "getMemberStatus(b, payments, currentMonth)"
);

file = file.replace(
  "getMemberStatus(member, payments.filter(p => p.month === currentMonth))",
  "getMemberStatus(member, payments, currentMonth)"
);

fs.writeFileSync('src/pages/tabs/MembersTab.tsx', file);

console.log("Updated MembersTab.tsx");
