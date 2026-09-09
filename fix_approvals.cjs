const fs = require('fs');
let file = fs.readFileSync('src/pages/tabs/PendingApprovals.tsx', 'utf8');

// Replace addDoc with writeBatch and detailed audit logs.
const newImports = `import { doc, updateDoc, addDoc, collection, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';`;
file = file.replace(`import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';`, newImports);

const handleApproveOld = `  const handleApprove = async () => {
    if (!canApprove || hasApprovedLevel1) return;
    try {
      setLoading(true);
      if (payment.status === 'pending') {
        await updateDoc(doc(db, 'payments', payment.id), { 
          status: 'level_1_approved', 
          firstApprovedBy: currentUser.id,
          firstApprovedAt: serverTimestamp() 
        });
        await addDoc(collection(db, 'activityLog'), {
          description: \`\${currentUser.displayName} একটি \${payment.paymentType === 'advance' ? 'অগ্রিম' : 'মাসিক'} প্রদেয় অনুমোদন করেছেন। প্রথম অনুমোদন সম্পন্ন হয়েছে।\`,
          timestamp: serverTimestamp(),
        });
        await sendPushNotificationToUsers([payment.userId], '💰 প্রথম ধাপের অনুমোদন', 'আপনার জমা প্রথম ধাপে অনুমোদিত হয়েছে।');
      } else if (payment.status === 'level_1_approved') {
        await updateDoc(doc(db, 'payments', payment.id), { 
          status: 'approved', 
          secondApprovedBy: currentUser.id,
          secondApprovedAt: serverTimestamp(),
          approvedBy: currentUser.id,
          approvedAt: serverTimestamp()
        });
        await addDoc(collection(db, 'activityLog'), {
          description: \`\${currentUser.displayName} একটি \${payment.paymentType === 'advance' ? 'অগ্রিম' : 'মাসিক'} প্রদেয় অনুমোদন করেছেন। দ্বিতীয় অনুমোদন সম্পন্ন হয়েছে।\`,
          timestamp: serverTimestamp(),
        });
        await sendPushNotificationToUsers([payment.userId], '💰 জমা অনুমোদিত', 'আপনার জমা সফলভাবে অনুমোদিত হয়েছে।');
      }
      onComplete?.();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };`;

const handleApproveNew = `  const handleApprove = async () => {
    if (!canApprove || hasApprovedLevel1) return;
    try {
      setLoading(true);
      
      const paymentRef = doc(db, 'payments', payment.id);
      
      await runTransaction(db, async (transaction) => {
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists()) throw new Error("Payment does not exist.");
        
        const currentData = paymentDoc.data();
        
        if (payment.status === 'pending') {
          if (currentData.status !== 'pending') throw new Error("Status already changed.");
          
          transaction.update(paymentRef, { 
            status: 'level_1_approved', 
            firstApprovedBy: currentUser.id,
            firstApprovedAt: serverTimestamp() 
          });
          
          const logRef = doc(collection(db, 'activityLog'));
          transaction.set(logRef, {
            description: \`\${currentUser.displayName} একটি \${payment.paymentType === 'advance' ? 'অগ্রিম' : 'মাসিক'} প্রদেয় অনুমোদন করেছেন। প্রথম অনুমোদন সম্পন্ন হয়েছে।\`,
            action: 'PAYMENT_FIRST_APPROVED',
            paymentId: payment.id,
            actorId: currentUser.id,
            actorName: currentUser.displayName,
            amount: payment.amount,
            timestamp: serverTimestamp(),
          });
        } else if (payment.status === 'level_1_approved') {
          if (currentData.status !== 'level_1_approved') throw new Error("Status already changed.");
          
          transaction.update(paymentRef, { 
            status: 'approved', 
            secondApprovedBy: currentUser.id,
            secondApprovedAt: serverTimestamp(),
            approvedBy: currentUser.id,
            approvedAt: serverTimestamp()
          });
          
          const logRef = doc(collection(db, 'activityLog'));
          transaction.set(logRef, {
            description: \`\${currentUser.displayName} একটি \${payment.paymentType === 'advance' ? 'অগ্রিম' : 'মাসিক'} প্রদেয় অনুমোদন করেছেন। দ্বিতীয় অনুমোদন সম্পন্ন হয়েছে।\`,
            action: 'PAYMENT_FULLY_APPROVED',
            paymentId: payment.id,
            actorId: currentUser.id,
            actorName: currentUser.displayName,
            amount: payment.amount,
            timestamp: serverTimestamp(),
          });
        }
      });
      
      if (payment.status === 'pending') {
        await sendPushNotificationToUsers([payment.userId], '💰 প্রথম ধাপের অনুমোদন', 'আপনার জমা প্রথম ধাপে অনুমোদিত হয়েছে।');
      } else {
        await sendPushNotificationToUsers([payment.userId], '💰 জমা অনুমোদিত', 'আপনার জমা সফলভাবে অনুমোদিত হয়েছে।');
      }
      
      onComplete?.();
    } catch (error) {
      console.error(error);
      alert("ত্রুটি: পেমেন্ট অনুমোদন করা যায়নি। " + error);
    } finally {
      setLoading(false);
    }
  };`;

file = file.replace(handleApproveOld, handleApproveNew);

// Reject log upgrade
const rejectOld = `      await updateDoc(doc(db, 'payments', payment.id), { 
        status: 'rejected',
        rejectReason: rejectReason,
        rejectedBy: currentUser.id,
        rejectedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'activityLog'), {
        description: \`\${currentUser.displayName} \${user?.displayName || 'সদস্য'}-এর \${payment.paymentType === 'advance' ? 'অগ্রিম' : 'মাসিক'} প্রদেয় বাতিল করেছেন। কারণ: \${rejectReason}\`,
        timestamp: serverTimestamp(),
      });`;

const rejectNew = `      const batch = writeBatch(db);
      const paymentRef = doc(db, 'payments', payment.id);
      batch.update(paymentRef, {
        status: 'rejected',
        rejectReason: rejectReason,
        rejectedBy: currentUser.id,
        rejectedAt: serverTimestamp()
      });
      const logRef = doc(collection(db, 'activityLog'));
      batch.set(logRef, {
        description: \`\${currentUser.displayName} \${user?.displayName || 'সদস্য'}-এর \${payment.paymentType === 'advance' ? 'অগ্রিম' : 'মাসিক'} প্রদেয় বাতিল করেছেন। কারণ: \${rejectReason}\`,
        action: 'PAYMENT_REJECTED',
        paymentId: payment.id,
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        amount: payment.amount,
        reason: rejectReason,
        timestamp: serverTimestamp(),
      });
      await batch.commit();`;

file = file.replace(rejectOld, rejectNew);

fs.writeFileSync('src/pages/tabs/PendingApprovals.tsx', file);
console.log("PendingApprovals updated.");
