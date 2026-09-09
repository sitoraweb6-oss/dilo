const fs = require('fs');
let code = fs.readFileSync('src/pages/tabs/HomeTab.tsx', 'utf8');

code = code.replace(/useEffect\(\(\) => \{\n    const unsubMembers = onSnapshot[\s\S]*?\}, \[currentMonth\]\);/, `useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [membersSnap, paymentsSnap, totalSnap, noticesSnap, activitiesSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'payments'), where('month', '==', currentMonth))),
          getDocs(query(collection(db, 'payments'), where('status', '==', 'approved'))),
          getDocs(query(collection(db, 'notices'), orderBy('postedAt', 'desc'), limit(1))),
          getDocs(query(collection(db, 'activityLog'), orderBy('timestamp', 'desc'), limit(5)))
        ]);
        
        if (!isMounted) return;
        
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        
        let total = 0;
        totalSnap.docs.forEach(doc => { total += doc.data().amount || 0; });
        setTotalSystemSavings(total);
        
        setNotices(noticesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setActivities(activitiesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
        
        setLoading(false);
      } catch (e) {
        console.error(e);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [currentMonth]);`);

fs.writeFileSync('src/pages/tabs/HomeTab.tsx', code);
