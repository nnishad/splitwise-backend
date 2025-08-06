const fs = require('fs');
const path = require('path');

// Files that need authentication fixes
const filesToFix = [
  'src/routes/balances.ts',
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
  
  // Replace all route handlers to use FastifyRequest and cast to AuthenticatedRequest
  content = content.replace(
    /async \(request: AuthenticatedRequest, reply: FastifyReply\) => \{/g,
    'async (request: FastifyRequest, reply: FastifyReply) => {'
  );
  
  // Add authenticatedRequest casting and fix user access
  content = content.replace(
    /request\.user\.userId/g,
    'authenticatedRequest.user.userId'
  );
  
  content = content.replace(
    /request\.user\.id/g,
    'authenticatedRequest.user.userId'
  );
  
  // Add the authenticatedRequest declaration after try {
  content = content.replace(
    /try \{/g,
    'try {\n      const authenticatedRequest = request as AuthenticatedRequest;'
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed authentication issues in ${filePath}`);
}

// Fix all files
filesToFix.forEach(fixAuthIssues);
console.log('\n🎉 All authentication issues fixed!'); 