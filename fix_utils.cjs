const fs = require('fs');

let file = fs.readFileSync('src/lib/paymentUtils.ts', 'utf8');

file = file.replace(
  "export function getMemberSlotSummary(member: UserProfile, currentMonthPayments: Payment[]): SlotSummary {",
  "export function getMemberSlotSummary(member: UserProfile, currentMonthPayments: Payment[], targetMonth: string): SlotSummary {"
);

file = file.replace(
  "const slotPayments = currentMonthPayments.filter(p => p.userId === member.id && p.nameId === slot.nameId && p.paymentType !== 'annual');",
  "const slotPayments = currentMonthPayments.filter(p => {\n      if (p.userId !== member.id || p.nameId !== slot.nameId || p.paymentType === 'annual') return false;\n      if (p.paymentType === 'advance') {\n        return p.coveredMonthsList && p.coveredMonthsList.includes(targetMonth);\n      }\n      return true;\n    });"
);

file = file.replace(
  "export function getMemberStatus(member: UserProfile, currentMonthPayments: Payment[]): 'approved' | 'partial' | 'pending' | 'not_submitted' {\n  return getMemberSlotSummary(member, currentMonthPayments).status;\n}",
  "export function getMemberStatus(member: UserProfile, currentMonthPayments: Payment[], targetMonth: string): 'approved' | 'partial' | 'pending' | 'not_submitted' {\n  return getMemberSlotSummary(member, currentMonthPayments, targetMonth).status;\n}"
);

file = file.replace(
  "export function getSystemSlotSummary(members: UserProfile[], currentMonthPayments: Payment[]) {",
  "export function getSystemSlotSummary(members: UserProfile[], currentMonthPayments: Payment[], targetMonth: string) {"
);

file = file.replace(
  "const summary = getMemberSlotSummary(member, currentMonthPayments);",
  "const summary = getMemberSlotSummary(member, currentMonthPayments, targetMonth);"
);

fs.writeFileSync('src/lib/paymentUtils.ts', file);

console.log("Updated paymentUtils.ts");
