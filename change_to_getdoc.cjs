const fs = require('fs');
let code = fs.readFileSync('src/components/home/UpcomingEventSection.tsx', 'utf8');

code = code.replace(
  /import \{ doc, onSnapshot, setDoc, serverTimestamp, deleteDoc \} from 'firebase\/firestore';/,
  `import { doc, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';`
);

code = code.replace(
  /  useEffect\(\(\) => \{\n    const unsub = onSnapshot\(doc\(db, 'settings', 'upcomingEvent'\), \(docSnap\) => \{\n      if \(docSnap\.exists\(\)\) \{\n        setEvent\(docSnap\.data\(\) as UpcomingEvent\);\n      \} else \{\n        setEvent\(null\);\n      \}\n      setLoading\(false\);\n    \}, \(error\) => \{\n      console\.error\("Error fetching upcoming event:", error\);\n      setLoading\(false\);\n    \}\);\n    return \(\) => unsub\(\);\n  \}, \[\]\);/g,
  `  const fetchEvent = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'upcomingEvent'));
      if (docSnap.exists()) {
        setEvent(docSnap.data() as UpcomingEvent);
      } else {
        setEvent(null);
      }
    } catch (error) {
      console.error("Error fetching upcoming event:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, []);`
);

fs.writeFileSync('src/components/home/UpcomingEventSection.tsx', code);
