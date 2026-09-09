const fs = require('fs');
const path = 'src/components/MemberProfileModal.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('overflow-y-auto p-5 pb-8 flex-1'));
if (startIndex !== -1) {
  lines[startIndex] = lines[startIndex].replace('overflow-y-auto p-5 pb-8 flex-1', 'overflow-y-auto flex-1 pb-32');
  lines.splice(startIndex + 1, 0, '            <div className="p-5">');
}

const superAdminIndex = lines.findIndex(l => l.includes('{/* Super Admin Actions */}'));
if (superAdminIndex !== -1) {
  // Before Super Admin actions, we need to close the `<div className="p-5">` we added above.
  lines.splice(superAdminIndex, 0, '            </div>');
  
  // Wait, there is already a `</div>` at superAdminIndex - 1 (which used to close overflow-y-auto).
  // We want to remove that `</div>` from there and move it below the Super Admin block.
  // The line is `          </div>` at `superAdminIndex - 2` originally (now -1 or -2 depending on previous splices).
}

// Let's just do a string replace, it's safer.
let content = fs.readFileSync(path, 'utf8');

// Replace the overflow div
content = content.replace(
  '<div className="overflow-y-auto p-5 pb-8 flex-1">',
  '<div className="overflow-y-auto flex-1 pb-32">\n          <div className="p-5">'
);

// Move the closing </div>
content = content.replace(
  '            </div>\n          </div>\n        \n        {/* Super Admin Actions */}',
  '            </div>\n          </div>\n          </div>\n        \n        {/* Super Admin Actions */}'
); // Wait, this doesn't move it.

