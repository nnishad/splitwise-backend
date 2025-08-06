const fs = require('fs');
const path = require('path');

// Files to update (excluding auth files and the script itself)
const filesToUpdate = [
  'src/routes/groups.ts',
  'src/routes/balances.ts',
  'src/routes/audit.ts',
  'src/routes/exchangeRates.ts',
  'src/routes/expenseTemplates.ts'
];

function updateFile(filePath) {
  console.log(`Updating ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace import
  content = content.replace(
    /import\s+\{\s*authenticateToken\s*\}\s+from\s+['"]\.\.\/middleware\/auth['"];?/g,
    "import { authenticateSupabaseToken } from '../middleware/supabaseAuth';"
  );
  
  // Replace preHandler usage
  content = content.replace(
    /preHandler:\s*authenticateToken/g,
    'preHandler: authenticateSupabaseToken'
  );
  
  // Update user ID references from request.user?.userId to request.user?.id
  content = content.replace(
    /request\.user\?\.userId/g,
    'request.user?.id'
  );
  
  // Update user ID references from request.user?.userId! to request.user?.id!
  content = content.replace(
    /request\.user\?\.userId!/g,
    'request.user?.id!'
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${filePath}`);
}

// Update each file
filesToUpdate.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    updateFile(filePath);
  } else {
    console.log(`⚠️  File not found: ${filePath}`);
  }
});

console.log('\n🎉 All files updated successfully!');
console.log('\nNext steps:');
console.log('1. Test the authentication flow');
console.log('2. Update any remaining user ID references');
console.log('3. Test all protected endpoints'); 