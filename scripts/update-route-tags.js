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

// Function to update a file with tags
function updateFileWithTags(filePath, tag) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Pattern to match schema definitions that don't already have tags
  const schemaPattern = /schema:\s*\{([^}]*)\}/g;
  
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

console.log('Route-based tag updates completed!'); 