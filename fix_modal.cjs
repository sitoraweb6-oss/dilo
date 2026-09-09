const fs = require('fs');
let content = fs.readFileSync('src/components/MemberProfileModal.tsx', 'utf8');

// 1. Change the wrapper
content = content.replace(
  '<div className="overflow-y-auto p-5 pb-8 flex-1">',
  '<div className="overflow-y-auto flex-1 pb-32 md:pb-8">\n          <div className="p-5">'
);

// 2. We need to find the `</div>` that closed the `overflow-y-auto`.
// It's located right before `{/* Super Admin Actions */}`
const searchStr = `            </div>
          </div>
        
        {/* Super Admin Actions */}`;

const replaceStr = `            </div>
          </div>
          </div>
        
        {/* Super Admin Actions */}`;
// Wait, if I do this, I'm just closing the new `<div className="p-5">`.
// But I need to move the `</div>` that closed `overflow-y-auto` to the end.

// Let's do it cleanly by splitting and joining.
const parts = content.split('        {/* Super Admin Actions */}');
if (parts.length === 2) {
  // parts[0] ends with:
  //             </div>
  //           </div>
  //         
  
  // We want to replace the last `</div>` in parts[0] with `</div>` (to close p-5)
  // and remove the `</div>` that closes overflow-y-auto. 
  // Wait, if we replace `</div>\n          </div>` with `</div>\n          </div>`, it's the same.
  // Actually, the `overflow-y-auto` was closed by `          </div>`.
  // Let's just remove `          </div>` from the end of parts[0], and add it to the end of parts[1] (before `</motion.div>`).

  let topPart = parts[0];
  // Replace the last `          </div>\n        \n` with `          </div>\n        \n` ? 
  // Let's just replace `          </div>\n        \n` with `\n        \n`.
  topPart = topPart.replace(/          <\/div>\s*$/, '');
  
  // Now add `</div>` to close the `<div className="p-5">` we opened.
  topPart += '          </div>\n        \n';

  let bottomPart = parts[1];
  // Replace `  </motion.div>` with `          </div>\n  </motion.div>`
  bottomPart = bottomPart.replace('  </motion.div>', '          </div>\n  </motion.div>');

  const finalContent = topPart + '        {/* Super Admin Actions */}' + bottomPart;
  fs.writeFileSync('src/components/MemberProfileModal.tsx', finalContent);
  console.log("Successfully updated modal structure.");
} else {
  console.log("Could not find Super Admin Actions.");
}

