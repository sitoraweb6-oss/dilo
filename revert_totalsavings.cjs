const fs = require('fs');
let code = fs.readFileSync('src/components/TotalSavingsModal.tsx', 'utf8');

code = code.replace(/useEffect\(\(\) => \{\n    if \(\!isOpen\) return;\n[\s\S]*?\}, \[isOpen, userProfile\]\);/, `useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [usersSnap, paymentsSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'payments'), where('status', '==', 'approved')))
        ]);
        
        if (!isMounted) return;
        
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
        const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
        
        const savings = users.map(user => {
          const userPayments = payments.filter(p => p.userId === user.id);
          const totalSaved = userPayments.reduce((sum, p) => sum + p.amount, 0);
          return {
            id: user.id,
            name: user.displayName,
            saved: totalSaved
          };
        });
        
        savings.sort((a, b) => {
          if (a.id === userProfile?.id) return -1;
          if (b.id === userProfile?.id) return 1;
          return b.saved - a.saved;
        });
        
        setMemberSavings(savings);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching savings data", error);
        if (isMounted) setLoading(false);
      }
    };
    if (isOpen) {
      fetchData();
    }
    return () => { isMounted = false; };
  }, [isOpen, userProfile]);`);

fs.writeFileSync('src/components/TotalSavingsModal.tsx', code);
