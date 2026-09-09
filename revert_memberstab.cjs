const fs = require('fs');
let code = fs.readFileSync('src/pages/tabs/MembersTab.tsx', 'utf8');

code = code.replace(/useEffect\(\(\) => \{\n    const unsubMembers = onSnapshot[\s\S]*?\}, \[currentMonth\]\);/, `useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [membersSnap, paymentsSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'payments'), where('month', '==', currentMonth)))
        ]);
        
        if (!isMounted) return;
        
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        setLoading(false);
      } catch (e) {
        console.error(e);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [currentMonth]);`);

fs.writeFileSync('src/pages/tabs/MembersTab.tsx', code);
