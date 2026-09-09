const fs = require('fs');
let file = fs.readFileSync('src/lib/paymentUtils.ts', 'utf8');

// Update getTotalSystemSavings
file = file.replace(
  /export function getTotalSystemSavings\(allPayments: Payment\[\]\): number \{\n  return allPayments\n    .filter\(p => p.status === 'approved'\)\n    .reduce\(\(sum, p\) => sum \+ \(p.amount \|\| 0\), 0\);\n\}/,
  `export function getTotalSystemSavings(allPayments: Payment[]): number {
  return allPayments
    .filter(p => p.status === 'approved' && !(p as any).isCopiedRecord)
    .reduce((sum, p) => sum + (p.amount || 0), 0);
}`
);

// We should also update getMemberTotalSavings if needed, but it should count copied records so the member sees their full "migrated" total in their personal tab.

fs.writeFileSync('src/lib/paymentUtils.ts', file);
console.log("paymentUtils.ts updated.");
