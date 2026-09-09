const fs = require('fs');
let file = fs.readFileSync('src/lib/paymentUtils.ts', 'utf8');

const newCalc = `export function calculatePaymentDetails(baseAmount: number, settings: PaymentSettings, targetMonthStr?: string) {
  const d = new Date();
  
  if (targetMonthStr) {
    const currentYear = d.getFullYear();
    const currentMonthNum = d.getMonth() + 1; // 1-based
    
    const [targetYearStr, targetMonthNumStr] = targetMonthStr.split('-');
    const targetYear = parseInt(targetYearStr, 10);
    const targetMonth = parseInt(targetMonthNumStr, 10);
    
    // Future month -> No fine
    if (targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonthNum)) {
      return { baseAmount, lateFine: 0, totalAmount: baseAmount };
    }
    
    // Past month -> Max fine
    if (targetYear < currentYear || (targetYear === currentYear && targetMonth < currentMonthNum)) {
      const maxFine = (settings.lateFee || 0) + (settings.secondPenaltyAmount || 0);
      return { baseAmount, lateFine: maxFine, totalAmount: baseAmount + maxFine };
    }
  }

  // Current month -> Day based calculation
  const currentDay = d.getDate();
  let lateFine = 0;
  if (currentDay >= settings.firstLateFeeStartDay) {
    lateFine += settings.lateFee;
  }
  if (currentDay >= settings.secondPenaltyDate) {
    lateFine += settings.secondPenaltyAmount;
  }

  return {
    baseAmount,
    lateFine,
    totalAmount: baseAmount + lateFine
  };
}`;

file = file.replace(/export function calculatePaymentDetails[\s\S]*?totalAmount:\s*baseAmount \+ lateFine\n\s*};\n}/m, newCalc);
fs.writeFileSync('src/lib/paymentUtils.ts', file);
console.log("paymentUtils.ts updated.");
