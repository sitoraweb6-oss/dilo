const fs = require('fs');
let file = fs.readFileSync('src/pages/VerifyPin.tsx', 'utf8');

const targetStr = `      <PinEntry 
        expectedPinHash={expectedHash} 
        onSuccess={handleSuccess} 
        onError={handleError}
      />`;

const replacement = `      <PinEntry 
        expectedPinHash={expectedHash} 
        onSuccess={handleSuccess} 
        onError={handleError}
      />
      <div className="mt-6 text-center z-10">
        <button 
          onClick={() => setShowRecoveryModal(true)}
          className="text-primary-600 font-medium hover:text-primary-700 transition-colors text-sm underline decoration-primary-300 underline-offset-4"
        >
          PIN ভুলে গেছেন?
        </button>
      </div>
      
      {showRecoveryModal && <PinRecoveryModal onClose={() => setShowRecoveryModal(false)} userProfile={userProfile} firebaseUser={firebaseUser} />}`;

// Try with normalized spaces since the file might be minified or differently formatted
// The file seems to have spaces: 
// <PinEntry \n         expectedPinHash={expectedHash} \n         onSuccess={handleSuccess} \n         onError={handleError}\n      />\n      <button \n         onClick={logout}
let found = false;
if (file.includes('PIN ভুলে গেছেন?')) {
  console.log('Already has button');
} else {
  // Let's replace just before the second logout button
  const splitStr = `<PinEntry \n         expectedPinHash={expectedHash} \n         onSuccess={handleSuccess} \n         onError={handleError}\n      />`;
  if (file.includes(splitStr)) {
    file = file.replace(splitStr, replacement);
    fs.writeFileSync('src/pages/VerifyPin.tsx', file);
    console.log('Replaced successfully');
  } else {
    // Let's use regex
    file = file.replace(/<PinEntry\s+expectedPinHash={expectedHash}\s+onSuccess={handleSuccess}\s+onError={handleError}\s*\/>/g, replacement);
    fs.writeFileSync('src/pages/VerifyPin.tsx', file);
    console.log('Regex replaced successfully');
  }
}
