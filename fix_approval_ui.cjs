const fs = require('fs');
let file = fs.readFileSync('src/pages/tabs/PendingApprovals.tsx', 'utf8');

const oldApprovalUi = `<p><strong>Total Amount:</strong> ৳{payment.amount}</p>
          <p><strong>Submission Date:</strong> {payment.submittedAt ? format(payment.submittedAt.toDate(), 'dd MMM yyyy, hh:mm a') : 'N/A'}</p>`;

const newApprovalUi = `<p><strong>Total Amount:</strong> ৳{payment.amount}</p>
          <p><strong>Submission Date:</strong> {payment.submittedAt ? format(payment.submittedAt.toDate(), 'dd MMM yyyy, hh:mm a') : 'N/A'}</p>
          {payment.firstApprovedBy && (
            <div className="bg-blue-50 p-2 rounded-lg mt-2 border border-blue-100">
              <p className="font-bold text-blue-700">✓ প্রথম অনুমোদন:</p>
              <p className="text-blue-600">Admin ID: {payment.firstApprovedBy}</p>
              {payment.firstApprovedAt && <p className="text-blue-500">{format(payment.firstApprovedAt.toDate(), 'dd MMM yyyy, hh:mm a')}</p>}
            </div>
          )}
          {payment.secondApprovedBy && (
            <div className="bg-emerald-50 p-2 rounded-lg mt-2 border border-emerald-100">
              <p className="font-bold text-emerald-700">✓ দ্বিতীয় অনুমোদন:</p>
              <p className="text-emerald-600">Admin ID: {payment.secondApprovedBy}</p>
              {payment.secondApprovedAt && <p className="text-emerald-500">{format(payment.secondApprovedAt.toDate(), 'dd MMM yyyy, hh:mm a')}</p>}
            </div>
          )}`;

file = file.replace(oldApprovalUi, newApprovalUi);
fs.writeFileSync('src/pages/tabs/PendingApprovals.tsx', file);
console.log("PendingApprovals UI updated.");
