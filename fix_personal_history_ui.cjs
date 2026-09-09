const fs = require('fs');
let file = fs.readFileSync('src/pages/tabs/PersonalTab.tsx', 'utf8');

const oldHistoryUi = `                   <div className="text-right">
                   <p className="text-sm font-bold text-slate-800">৳{payment.amount}</p>
                   {payment.lateFine && payment.lateFine > 0 && (
                     <p className="text-[10px] text-red-500">জরিমানা: ৳{payment.lateFine}</p>
                   )}
                 </div>`;

const newHistoryUi = `                   <div className="text-right">
                   <p className="text-sm font-bold text-slate-800">৳{payment.amount}</p>
                   {payment.lateFine && payment.lateFine > 0 && (
                     <p className="text-[10px] text-red-500">জরিমানা: ৳{payment.lateFine}</p>
                   )}
                 </div>
              </div>
              <div className="mt-2 text-[10px] flex gap-2 flex-wrap text-slate-500 bg-slate-50 p-2 rounded-xl">
                 <span className="flex items-center gap-1">✓ জমা: {payment.submittedAt ? format(payment.submittedAt.toDate(), 'dd MMM, hh:mm a') : 'N/A'}</span>
                 {payment.status === 'rejected' && payment.rejectReason && (
                   <span className="flex items-center gap-1 text-red-600">❌ বাতিল কারণ: {payment.rejectReason}</span>
                 )}
                 {payment.firstApprovedBy && (
                   <span className="flex items-center gap-1 text-blue-600">✓ ১ম অনুমোদন সম্পন্ন</span>
                 )}
                 {payment.secondApprovedBy && (
                   <span className="flex items-center gap-1 text-emerald-600">✓ চূড়ান্ত অনুমোদন সম্পন্ন</span>
                 )}`;

file = file.replace(oldHistoryUi, newHistoryUi);

// Oh wait, in the replace above I matched `</div>` which would close the item div, so I need to remove one `</div>` from the map below it.
file = file.replace(`               </div>\n            ))}          </div>`, `            ))}          </div>`);

fs.writeFileSync('src/pages/tabs/PersonalTab.tsx', file);
console.log("PersonalTab history UI updated.");
