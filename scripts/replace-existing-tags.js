const fs = require('fs');
const path = require('path');

// Define tag mappings for each route file (matching file names)
const tagMappings = {
  'src/routes/auth.ts': 'auth',
  'src/routes/users.ts': 'users',
  'src/routes/sessions.ts': 'sessions',
  'src/routes/groups.ts': 'groups',
  'src/routes/expenses.ts': 'expenses',
  'src/routes/expenseTemplates.ts': 'expenseTemplates',
  'src/routes/balances.ts': 'balances',
  'src/routes/exchangeRates.ts': 'exchangeRates',
  'src/routes/audit.ts': 'audit'
};

// Function to replace existing tags
function replaceExistingTags(filePath, newTag) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace existing tags with new route-based tags
  content = content.replace(/tags:\s*\[['"][^'"]*['"]\]/g, `tags: ['${newTag}']`);
  
  fs.writeFileSync(filePath, content);
  console.log(`Replaced tags in ${filePath} with: ${newTag}`);
}

// Update all files
Object.entries(tagMappings).forEach(([filePath, tag]) => {
  if (fs.existsSync(filePath)) {
    replaceExistingTags(filePath, tag);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log('Tag replacement completed!'); 