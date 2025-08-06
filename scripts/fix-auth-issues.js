const fs = require('fs');
const path = require('path');

// Files that need authentication fixes
const filesToFix = [
  'src/routes/audit.ts',
  'src/routes/exchangeRates.ts',
  'src/routes/expenses.ts',
  'src/routes/expenseTemplates.ts'
];

function fixAuthIssues(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix import statements
  content = content.replace(
    /import \{ authenticateUser \} from '\.\.\/middleware\/auth';/g,
    `import { authenticateToken } from '../middleware/auth';
import { JWTPayload } from '../utils/auth';`
  );
  
  // Fix AuthenticatedRequest interface
  content = content.replace(
    /interface AuthenticatedRequest extends FastifyRequest \{\s*user: \{\s*id: string;\s*email: string;\s*name: string;\s*\};\s*\}/g,
    `interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload;
}`
  );
  
  // Fix authenticateUser references
  content = content.replace(/authenticateUser/g, 'authenticateToken');
  
  // Fix user.id references to user.userId
  content = content.replace(/request\.user\.id/g, 'request.user.userId');
  
  // Fix user property access
  content = content.replace(/request\.user\.id/g, 'request.user?.userId');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed authentication issues in ${filePath}`);
}

// Fix all files
filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    fixAuthIssues(filePath);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log('Authentication issues fixed!'); 