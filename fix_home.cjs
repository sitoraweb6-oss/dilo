const fs = require('fs');

let file = fs.readFileSync('src/pages/tabs/HomeTab.tsx', 'utf8');

const queryOld = `        const [membersSnap, paymentsSnap, totalSnap, noticesSnap, activitiesSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'payments'), where('month', '==', currentMonth))),
          getDocs(query(collection(db, 'payments'), where('status', '==', 'approved'))),
          getDocs(query(collection(db, 'notices'), orderBy('postedAt', 'desc'), limit(1))),
          getDocs(query(collection(db, 'activityLog'), orderBy('timestamp', 'desc'), limit(5)))
        ]);
        
        if (!isMounted) return;
        
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));`;

const queryNew = `        const q1 = query(collection(db, 'payments'), where('month', '==', currentMonth));
        const q2 = query(collection(db, 'payments'), where('coveredMonthsList', 'array-contains', currentMonth));
        const [membersSnap, snap1, snap2, totalSnap, noticesSnap, activitiesSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
          getDocs(q1),
          getDocs(q2),
          getDocs(query(collection(db, 'payments'), where('status', '==', 'approved'))),
          getDocs(query(collection(db, 'notices'), orderBy('postedAt', 'desc'), limit(1))),
          getDocs(query(collection(db, 'activityLog'), orderBy('timestamp', 'desc'), limit(5)))
        ]);
        
        if (!isMounted) return;
        
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        const paymentsMap = new Map();
        snap1.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
        snap2.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
        totalSnap.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
        setPayments(Array.from(paymentsMap.values()));`;

file = file.replace(queryOld, queryNew);

// Fix getMemberSlotSummary usages
file = file.replace(
  "getMemberSlotSummary(userProfile, payments) : null;",
  "getMemberSlotSummary(userProfile, payments, currentMonth) : null;"
);

file = file.replace(
  "getMemberSlotSummary(userProfile, payments.filter(p => p.month === currentMonth && p.userId === userProfile.id));",
  "getMemberSlotSummary(userProfile, payments.filter(p => p.userId === userProfile.id), currentMonth);"
);

file = file.replace(
  "getSystemSlotSummary(members, payments);",
  "getSystemSlotSummary(members, payments, currentMonth);"
);

file = file.replace(
  "getMemberSlotSummary(m, payments.filter(p => p.month === currentMonth)).paidSlots",
  "getMemberSlotSummary(m, payments, currentMonth).paidSlots"
);

// Fix getMemberStatus
file = file.replace(
  "getMemberStatus(member, payments) === 'approved'",
  "getMemberStatus(member, payments, currentMonth) === 'approved'"
);

file = file.replace(
  "getMemberStatus(member, payments) === 'pending'",
  "getMemberStatus(member, payments, currentMonth) === 'pending'"
);

fs.writeFileSync('src/pages/tabs/HomeTab.tsx', file);

console.log("Updated HomeTab.tsx");
