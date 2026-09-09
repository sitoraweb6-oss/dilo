const fs = require('fs');
let file = fs.readFileSync('src/pages/tabs/HomeTab.tsx', 'utf8');

if (!file.includes('HomeInvestmentSection')) {
  file = file.replace(
    "import { TotalSavingsCard } from '../../components/home/TotalSavingsCard';",
    "import { TotalSavingsCard } from '../../components/home/TotalSavingsCard';\nimport { HomeInvestmentSection } from '../../components/home/HomeInvestmentSection';"
  );
  
  file = file.replace(
    "<TotalSavingsCard totalSystemSavings={totalSystemSavings} onClick={() => navigate('/', { state: { tab: 'reports' } })} />",
    "<TotalSavingsCard totalSystemSavings={totalSystemSavings} onClick={() => navigate('/', { state: { tab: 'reports' } })} />\n        <HomeInvestmentSection />"
  );
  
  fs.writeFileSync('src/pages/tabs/HomeTab.tsx', file);
}
