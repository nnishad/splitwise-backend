const fs = require('fs');
const path = require('path');

// Define tag mappings for each route file
const tagMappings = {
  'src/routes/balances.ts': 'Balances',
  'src/routes/exchangeRates.ts': 'Exchange Rates',
  'src/routes/groups.ts': 'Groups',
  'src/routes/expenseTemplates.ts': 'Expense Templates',
  'src/routes/users.ts': 'Users',
  'src/routes/audit.ts': 'Audit',
  'src/routes/expenses.ts': 'Expenses',
  'src/routes/sessions.ts': 'Sessions',
  'src/routes/auth.ts': 'Authentication'
};

// Function to update a file with tags
function updateFileWithTags(filePath, tag) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Pattern to match schema definitions that don't already have tags
  const schemaPattern = /schema:\s*\{([^}]*)\}/g;
  const schemaWithTagsPattern = /schema:\s*\{\s*\.\.\.\w+Schema,\s*tags:\s*\[[^\]]+\]\s*\}/g;
  
  // Replace schema definitions that don't have tags
  content = content.replace(schemaPattern, (match, schemaContent) => {
    // Skip if it already has tags
    if (schemaContent.includes('tags:')) {
      return match;
    }
    
    // Check if it's a simple schema reference
    if (schemaContent.trim().match(/^\w+Schema$/)) {
      return `schema: {
        ...${schemaContent.trim()},
        tags: ['${tag}']
      }`;
    }
    
    // For complex schema objects, add tags at the beginning
    return `schema: {
        tags: ['${tag}'],
        ${schemaContent}
      }`;
  });
  
  // Handle routes without explicit schema objects
  const routePattern = /fastify\.(get|post|put|delete)\([^,]+,\s*\{[^}]*preHandler:[^}]*\}/g;
  content = content.replace(routePattern, (match) => {
    if (!match.includes('schema:')) {
      return match.replace(/\{([^}]*)\}/, '{\n      schema: {\n        tags: [\'' + tag + '\']\n      },\n      $1\n    }');
    }
    return match;
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath} with tag: ${tag}`);
}

// Update all files
Object.entries(tagMappings).forEach(([filePath, tag]) => {
  if (fs.existsSync(filePath)) {
    updateFileWithTags(filePath, tag);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log('Swagger tag updates completed!'); 