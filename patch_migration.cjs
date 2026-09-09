const fs = require('fs');
let file = fs.readFileSync('src/pages/AccountMigration.tsx', 'utf8');

file = file.replace(
  `const oldStats = getMemberSlotSummary(selectedOld, payments);`,
  `const oldStats = {
        slots: selectedOld.names?.length || 0,
        slotNames: selectedOld.names?.map(n => n.label) || [],
        monthlyDue: (selectedOld.names?.length || 0) * 1000,
        paidTotal: payments.filter(p => p.userId === selectedOld.id && p.status === 'approved').reduce((sum, p) => sum + p.amount, 0),
        advanceTotal: 0,
        due: 0,
        paymentCount: payments.filter(p => p.userId === selectedOld.id).length,
        fundOwnership: payments.filter(p => p.userId === selectedOld.id && p.status === 'approved').reduce((sum, p) => sum + p.amount, 0)
      };`
);

fs.writeFileSync('src/pages/AccountMigration.tsx', file);
console.log("AccountMigration patched");
