const fs = require('fs');
let file = fs.readFileSync('src/components/home/PendingApprovalsSection.tsx', 'utf8');

file = file.replace(
  "          for (let i = 0; i < request.requestedSlotsCount; i++) {\n            const newSlotId = doc(collection(db, 'users')).id; // generate unique id\n            newNames.push({\n              nameId: newSlotId,\n              label: `স্লট ${currentNames.length + i + 1}`,\n              monthlyDue: request.monthlyDuePerSlot,\n              activeFromMonth: currentMonthString\n            });\n          }",
  "          for (let i = 0; i < request.requestedSlotsCount; i++) {\n            const newSlotId = doc(collection(db, 'users')).id; // generate unique id\n            const defaultLabel = `স্লট ${currentNames.length + i + 1}`;\n            const customLabel = request.requestedSlotNames?.[i] || defaultLabel;\n            newNames.push({\n              nameId: newSlotId,\n              label: customLabel,\n              monthlyDue: request.monthlyDuePerSlot,\n              activeFromMonth: currentMonthString\n            });\n          }"
);

const requestedSlotNamesUI = `
      <div className="space-y-2 mb-4 text-sm bg-slate-50 p-3 rounded-xl">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 text-xs font-medium">নতুন স্লট:</span>
          <span className="text-indigo-600 font-bold">+{request.requestedSlotsCount}টি</span>
        </div>
        
        {request.requestedSlotNames && request.requestedSlotNames.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-slate-500 text-[10px] font-bold uppercase mb-1">স্লটের নামসমূহ:</div>
            {request.requestedSlotNames.map((name, idx) => (
              <div key={idx} className="text-xs font-bold text-slate-700 bg-white p-2 rounded border border-slate-100 flex items-center gap-2">
                <span className="text-indigo-400 font-normal">{request.requestedSlotsCount > 1 ? \`স্লট \${idx + 1}: \` : ''}</span>
                {name}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
          <span className="text-slate-600 text-xs font-medium">প্রতি স্লটে প্রদেয়:</span>
          <span className="text-slate-800 font-bold">৳{request.monthlyDuePerSlot}</span>
        </div>
      </div>
`;

file = file.replace(
  /<div className="space-y-2 mb-4 text-sm bg-slate-50 p-3 rounded-xl">[\s\S]*?<\/div>\n      <\/div>/,
  requestedSlotNamesUI.trim()
);

fs.writeFileSync('src/components/home/PendingApprovalsSection.tsx', file);
console.log("Updated PendingApprovalsSection.tsx");
