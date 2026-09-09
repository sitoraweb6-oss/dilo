const fs = require('fs');

// ReportsTab.tsx
let rTab = fs.readFileSync('src/pages/tabs/ReportsTab.tsx', 'utf8');
rTab = rTab.replace(
  "const currentMonthPayments = payments.filter(p => p.month === currentMonth);",
  "const currentMonthPayments = payments.filter(p => p.month === currentMonth || (p.paymentType === 'advance' && p.coveredMonthsList && p.coveredMonthsList.includes(currentMonth)));"
);
rTab = rTab.replace(
  "getSystemSlotSummary(members.filter(m => m.status === 'active'), currentMonthPayments);",
  "getSystemSlotSummary(members.filter(m => m.status === 'active'), currentMonthPayments, currentMonth);"
);
fs.writeFileSync('src/pages/tabs/ReportsTab.tsx', rTab);


// Dashboard.tsx
let dTab = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
dTab = dTab.replace(
  "getMemberSlotSummary(userProfile, currentMonthPayments) : null;",
  "getMemberSlotSummary(userProfile, currentMonthPayments, currentMonth) : null;"
);
fs.writeFileSync('src/pages/Dashboard.tsx', dTab);


// PersonalTab.tsx
let pTab = fs.readFileSync('src/pages/tabs/PersonalTab.tsx', 'utf8');
pTab = pTab.replace(
  "const slotSummary = getMemberSlotSummary(userProfile, currentMonthPayments);",
  "const slotSummary = getMemberSlotSummary(userProfile, currentMonthPayments, currentMonth);"
);
fs.writeFileSync('src/pages/tabs/PersonalTab.tsx', pTab);


// MemberProfileModal.tsx
let mTab = fs.readFileSync('src/components/MemberProfileModal.tsx', 'utf8');
mTab = mTab.replace(
  "const slotSummary = getMemberSlotSummary(member, currentMonthPayments);",
  "const slotSummary = getMemberSlotSummary(member, currentMonthPayments, currentMonth);"
);
fs.writeFileSync('src/components/MemberProfileModal.tsx', mTab);


// useCurrentMonthPayments.ts
let uTab = fs.readFileSync('src/lib/useCurrentMonthPayments.ts', 'utf8');
uTab = uTab.replace(
  "return getMemberSlotSummary(member, currentMonthPayments).status;",
  "return getMemberSlotSummary(member, currentMonthPayments, currentMonth).status;"
);
fs.writeFileSync('src/lib/useCurrentMonthPayments.ts', uTab);


// usePaymentStatus.ts
let upTab = fs.readFileSync('src/hooks/usePaymentStatus.ts', 'utf8');
upTab = upTab.replace(
  "const summary = getMemberSlotSummary(userProfile, payments);",
  "const summary = getMemberSlotSummary(userProfile, payments, month);"
);
fs.writeFileSync('src/hooks/usePaymentStatus.ts', upTab);

console.log("Updated other files");
