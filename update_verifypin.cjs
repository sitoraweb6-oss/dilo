const fs = require('fs');
let file = fs.readFileSync('src/pages/VerifyPin.tsx', 'utf8');

if (!file.includes('PIN ভুলে গেছেন?')) {
  // We need to add state for showing the recovery modal
  const stateInjection = `  const [showRecoveryModal, setShowRecoveryModal] = useState(false);`;
  
  file = file.replace(`const [timeRemaining, setTimeRemaining] = useState<number>(0);`, `const [timeRemaining, setTimeRemaining] = useState<number>(0);\n${stateInjection}`);
  
  const buttonCode = `
      <div className="mt-6">
        <button 
          onClick={() => setShowRecoveryModal(true)}
          className="text-primary-600 font-medium hover:text-primary-700 transition-colors text-sm underline decoration-primary-300 underline-offset-4"
        >
          PIN ভুলে গেছেন?
        </button>
      </div>
      
      {showRecoveryModal && <PinRecoveryModal onClose={() => setShowRecoveryModal(false)} userProfile={userProfile} firebaseUser={firebaseUser} />}
`;

  file = file.replace(`      <button \n         onClick={logout}`, `${buttonCode}\n      <button \n         onClick={logout}`);
  
  // Also we need to import PinRecoveryModal
  file = file.replace(`import { motion } from 'motion/react';`, `import { motion } from 'motion/react';\nimport { PinRecoveryModal } from '../components/PinRecoveryModal';`);

  fs.writeFileSync('src/pages/VerifyPin.tsx', file);
  console.log("VerifyPin.tsx updated.");
}
