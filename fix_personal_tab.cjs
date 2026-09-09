const fs = require('fs');
let file = fs.readFileSync('src/pages/tabs/PersonalTab.tsx', 'utf8');

// Add missing state for selectedMonth
file = file.replace(`const [paymentMethod, setPaymentMethod] = useState('');`, `const [paymentMethod, setPaymentMethod] = useState('');\n  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));`);

// Replace the calculatePaymentDetails usage in handleSubmit
file = file.replace(
  `const calc = activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings) : { totalAmount: 0, lateFine: 0, baseAmount: 0 };`,
  `const calc = activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings, paymentType === 'monthly' ? selectedMonth : undefined) : { totalAmount: 0, lateFine: 0, baseAmount: 0 };`
);

// Update coveredMonthsList for monthly
file = file.replace(
  `      if (paymentType === 'monthly') {\n        coveredMonthsList = [currentMonth];\n      }`,
  `      if (paymentType === 'monthly') {\n        coveredMonthsList = [selectedMonth];\n      }`
);

// Add writeBatch import
file = file.replace(`import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';`, `import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, writeBatch, doc } from 'firebase/firestore';`);

// Replace the addDoc logic with batch write
const oldAddDoc = `      await addDoc(collection(db, 'payments'), paymentData);\n\n      const monthNamesBangla = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];\n      let logDesc = \`\${userProfile.displayName} \${activeSlot.label} এর জন্য পেমেন্ট জমা দিয়েছেন\`;\n      if (paymentType === 'advance' && selectedAdvanceMonths.length > 0) {\n        const monthNames = selectedAdvanceMonths.sort((a,b)=>a-b).map(m => monthNamesBangla[m-1]);\n        const monthsStr = monthNames.length > 1 \n          ? monthNames.slice(0, -1).join(', ') + ' ও ' + monthNames[monthNames.length - 1]\n          : monthNames[0];\n        logDesc = \`\${userProfile.displayName} \${monthsStr} মাসের জন্য ৳\${advanceRequiredTotal} অগ্রিম প্রদেয় জমা দিয়েছেন।\`;\n      }\n\n      await addDoc(collection(db, 'activityLog'), {\n        description: logDesc,\n        timestamp: serverTimestamp(),\n      });`;

const newBatchWrite = `      const batch = writeBatch(db);
      
      const paymentRef = doc(collection(db, 'payments'));
      // Update paymentData to use the actual selected month
      paymentData.month = paymentType === 'monthly' ? selectedMonth : currentMonth;
      
      batch.set(paymentRef, paymentData);

      const monthNamesBangla = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
      let logDesc = \`\${userProfile.displayName} \${activeSlot.label} এর জন্য পেমেন্ট জমা দিয়েছেন\`;
      if (paymentType === 'advance' && selectedAdvanceMonths.length > 0) {
        const monthNames = selectedAdvanceMonths.sort((a,b)=>a-b).map(m => monthNamesBangla[m-1]);
        const monthsStr = monthNames.length > 1 
          ? monthNames.slice(0, -1).join(', ') + ' ও ' + monthNames[monthNames.length - 1]
          : monthNames[0];
        logDesc = \`\${userProfile.displayName} \${monthsStr} মাসের জন্য ৳\${advanceRequiredTotal} অগ্রিম প্রদেয় জমা দিয়েছেন।\`;
      } else if (paymentType === 'monthly') {
        const smMonth = parseInt(selectedMonth.split('-')[1]);
        logDesc = \`\${userProfile.displayName} \${monthNamesBangla[smMonth-1]} মাসের জন্য পেমেন্ট জমা দিয়েছেন\`;
      }

      const logRef = doc(collection(db, 'activityLog'));
      batch.set(logRef, {
        description: logDesc,
        action: 'PAYMENT_SUBMITTED',
        paymentId: paymentRef.id,
        memberId: userProfile.id,
        memberName: userProfile.displayName,
        slotId: activeSlot.nameId,
        amount: requiredAmount,
        timestamp: serverTimestamp(),
      });
      
      await batch.commit();`;

file = file.replace(oldAddDoc, newBatchWrite);

// Replace currentMonth usage for monthly display in JSX
const jsxReplace = `{paymentType === 'monthly' && (hasApproved || hasPending) ? (
          <div className="p-4 bg-slate-50 text-center rounded-2xl text-slate-500 text-sm">
            মাসিক পেমেন্ট সম্পন্ন বা পেন্ডিং আছে।
          </div>
        ) : paymentType === 'annual' && (hasAnnualApproved || hasAnnualPending) ? (`;

const newJsx = `{paymentType === 'annual' && (hasAnnualApproved || hasAnnualPending) ? (
          <div className="p-4 bg-slate-50 text-center rounded-2xl text-slate-500 text-sm">
            বার্ষিক পেমেন্ট সম্পন্ন বা পেন্ডিং আছে।
          </div>
        ) : (
          <div className="space-y-4">
            <div>
            {paymentType === 'monthly' && (
              <div className="mb-4 bg-white border border-slate-200 rounded-xl p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">মাসের নাম নির্বাচন করুন *</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
                    const sm = \`\${currentYear}-\${m.toString().padStart(2, '0')}\`;
                    const statusObj = getMonthCoveredStatus(m);
                    const disabled = statusObj.isCovered;
                    const label = \`\${monthsList.find(ml => ml.num === m)?.name} \${currentYear}\${disabled ? (statusObj.status === 'approved' ? ' (পরিশোধিত)' : ' (অপেক্ষমাণ)') : ''}\`;
                    return <option key={m} value={sm} disabled={disabled}>{label}</option>;
                  })}
                </select>
                <p className="text-xs text-slate-500 mt-2">বর্তমান জরিমানা: ৳{activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings, selectedMonth).lateFine : 0}</p>
              </div>
            )}
            `;

file = file.replace(
  `{paymentType === 'monthly' && (hasApproved || hasPending) ? (\n          <div className="p-4 bg-slate-50 text-center rounded-2xl text-slate-500 text-sm">\n            মাসিক পেমেন্ট সম্পন্ন বা পেন্ডিং আছে。\n          </div>\n        ) : paymentType === 'annual' && (hasAnnualApproved || hasAnnualPending) ? (`,
  newJsx
);

// We need to fix the JSX matching because it was partly removed
file = file.replace(
  `<div className="space-y-4">\n            <div>\n                        {paymentType === 'advance' && (`,
  `{paymentType === 'advance' && (`
);

file = file.replace(
  `{(activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings).lateFine : 0) > 0 && (`,
  `{(activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings, paymentType === 'monthly' ? selectedMonth : undefined).lateFine : 0) > 0 && (`
);
file = file.replace(
  `<p className="text-sm font-bold text-red-500">+ ৳{activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings).lateFine : 0}</p>`,
  `<p className="text-sm font-bold text-red-500">+ ৳{activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings, paymentType === 'monthly' ? selectedMonth : undefined).lateFine : 0}</p>`
);
file = file.replace(
  `<p className="text-lg font-black text-primary-600">৳{activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings).totalAmount : 0}</p>`,
  `<p className="text-lg font-black text-primary-600">৳{activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings, paymentType === 'monthly' ? selectedMonth : undefined).totalAmount : 0}</p>`
);

// Let's rewrite this part cleanly by creating a complete script for it.
fs.writeFileSync('fix_personal_tab.js', file);
