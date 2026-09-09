const fs = require('fs');
let code = fs.readFileSync('src/pages/tabs/ReportsTab.tsx', 'utf8');

code = code.replace(/useEffect\(\(\) => \{\n    const unsubPayments = onSnapshot[\s\S]*?\}, \[\]\);/, `useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [paymentsSnap, expensesSnap, membersSnap] = await Promise.all([
          getDocs(collection(db, 'payments')),
          getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'))),
          getDocs(collection(db, 'users'))
        ]);
        
        if (!isMounted) return;
        
        setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        setExpenses(expensesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching report data", error);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);`);

fs.writeFileSync('src/pages/tabs/ReportsTab.tsx', code);
