const fs = require('fs');
let code = fs.readFileSync('src/pages/tabs/PersonalTab.tsx', 'utf8');

code = code.replace(/useEffect\(\(\) => \{\n    if \(\!userProfile\) return;\n    const q = query\([\s\S]*?\}, \[userProfile\]\);/, `useEffect(() => {
    if (!userProfile) return;
    let isMounted = true;
    const fetchData = async () => {
      try {
        const q = query(
          collection(db, 'payments'),
          where('userId', '==', userProfile.id),
          orderBy('month', 'desc')
        );
        const snap = await getDocs(q);
        if (isMounted) {
          setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [userProfile]);`);

fs.writeFileSync('src/pages/tabs/PersonalTab.tsx', code);
