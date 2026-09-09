const fs = require('fs');
let code = fs.readFileSync('src/pages/tabs/NoticesTab.tsx', 'utf8');

code = code.replace(/useEffect\(\(\) => \{\n    const q = query\([\s\S]*?\}, \[\]\);/, `useEffect(() => {
    let isMounted = true;
    const q = query(collection(db, 'notices'), orderBy('postedAt', 'desc'));
    getDocs(q).then((snap) => {
      if (isMounted) setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notice)));
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);`);

fs.writeFileSync('src/pages/tabs/NoticesTab.tsx', code);
