const fs = require('fs');
let code = fs.readFileSync('src/hooks/usePaymentStatus.ts', 'utf8');

code = code.replace(/const unsub = onSnapshot\(q, \(snap\) => \{[\s\S]*?return \(\) => unsub\(\);/, `getDocs(q).then((snap) => {
      if (!isMounted) return;
      const payments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
      
      if (userProfile) {
        const summary = getMemberSlotSummary(userProfile, payments);
        setSlotSummary(summary);
        setStatus(summary.status);
        setAmount(payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0));
      } else {
        if (payments.length === 0) {
          setStatus('not_submitted');
          setAmount(0);
        } else {
          const approved = payments.filter(p => p.status === 'approved');
          const pending = payments.filter(p => p.status === 'pending');
          
          if (approved.length > 0) {
            setStatus('approved');
            setAmount(approved.reduce((sum, p) => sum + p.amount, 0));
            setApprovedAt(approved[0].approvedAt);
          } else if (pending.length > 0) {
            setStatus('pending');
            setAmount(pending.reduce((sum, p) => sum + p.amount, 0));
          } else {
            setStatus('not_submitted');
            setAmount(0);
          }
        }
      }
      setLoading(false);
    }).catch(e => {
      console.error(e);
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };`);

code = code.replace(/const q = query\(/, `let isMounted = true;\n    const q = query(`);

fs.writeFileSync('src/hooks/usePaymentStatus.ts', code);
