#!/usr/bin/env node

const API_BASE = 'http://localhost:3000/api/v1';

// Working user credentials from the rules
const workingUser = {
  email: 'nikhilnishadatuk@gmail.com',
  password: 'zxcvbnm.',
  name: 'Nikhil Nishad'
};

// Test users for scenarios (using valid email formats)
const testUsers = [
  {
    name: 'Alice Johnson',
    email: 'alice.johnson@test.com',
    password: 'password123',
    preferredCurrency: 'USD'
  },
  {
    name: 'Bob Smith',
    email: 'bob.smith@test.com',
    password: 'password123',
    preferredCurrency: 'EUR'
  },
  {
    name: 'Carol Davis',
    email: 'carol.davis@test.com',
    password: 'password123',
    preferredCurrency: 'GBP'
  }
];

// Store user sessions
const userSessions = {};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logScenario(message) {
  log(`🎭 ${message}`, 'magenta');
}

function logStep(message) {
  log(`  📋 ${message}`, 'cyan');
}

async function makeRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    return {
      status: response.status,
      data,
      headers: response.headers
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      headers: {}
    };
  }
}

async function testHealthCheck() {
  logInfo('Testing health check...');
  
  try {
    const response = await fetch('http://localhost:3000/health');
    const data = await response.json();
    
    if (response.status === 200) {
      logSuccess('Health check passed');
      return true;
    } else {
      logError('Health check failed');
      return false;
    }
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    return false;
  }
}

async function signinWorkingUser() {
  logStep(`Signing in working user: ${workingUser.name}...`);
  
  const response = await makeRequest('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({
      email: workingUser.email,
      password: workingUser.password
    })
  });

  if (response.status === 200) {
    logSuccess(`${workingUser.name} signed in successfully`);
    if (response.data.session) {
      userSessions[workingUser.email] = {
        accessToken: response.data.session.access_token,
        refreshToken: response.data.session.refresh_token,
        user: response.data.user
      };
      logInfo(`  User ID: ${response.data.user.id}`);
      logInfo(`  Email: ${response.data.user.email}`);
      logInfo(`  Preferred Currency: ${response.data.user.preferredCurrency}`);
      logInfo(`  Access Token: ${response.data.session.access_token.substring(0, 20)}...`);
    }
    return true;
  } else {
    logError(`${workingUser.name} signin failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function getCurrentUser(userEmail) {
  logStep(`Getting current user info for ${userEmail}...`);
  
  const session = userSessions[userEmail];
  if (!session) {
    logError(`No session found for ${userEmail}`);
    return null;
  }

  const response = await makeRequest('/auth/me', {
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    }
  });

  if (response.status === 200) {
    logSuccess(`User info retrieved for ${userEmail}`);
    logInfo(`  Name: ${response.data.user.name}`);
    logInfo(`  Email: ${response.data.user.email}`);
    logInfo(`  Preferred Currency: ${response.data.user.preferredCurrency}`);
    return response.data.user;
  } else {
    logError(`Failed to get user info: ${response.data.message || 'Unknown error'}`);
    return null;
  }
}

async function updateUserProfile(userEmail, updateData) {
  logStep(`Updating profile for ${userEmail}...`);
  
  const session = userSessions[userEmail];
  if (!session) {
    logError(`No session found for ${userEmail}`);
    return false;
  }

  const response = await makeRequest('/auth/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    },
    body: JSON.stringify(updateData)
  });

  if (response.status === 200) {
    logSuccess(`Profile updated for ${userEmail}`);
    logInfo(`  Updated name: ${response.data.user.name}`);
    logInfo(`  Updated currency: ${response.data.user.preferredCurrency}`);
    return true;
  } else {
    logError(`Profile update failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function createGroup(userEmail, groupData) {
  logStep(`Creating group: ${groupData.name}`);
  
  const session = userSessions[userEmail];
  if (!session) {
    logError(`No session found for ${userEmail}`);
    return null;
  }

  const response = await makeRequest('/groups', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    },
    body: JSON.stringify(groupData)
  });

  if (response.status === 201) {
    logSuccess(`Group "${groupData.name}" created successfully`);
    logInfo(`  Group ID: ${response.data.data.id}`);
    logInfo(`  Group Name: ${response.data.data.name}`);
    logInfo(`  Default Currency: ${response.data.data.defaultCurrency}`);
    return response.data.data;
  } else {
    logError(`Group creation failed: ${response.data.message || 'Unknown error'}`);
    return null;
  }
}

async function addMemberToGroup(userEmail, groupId, memberEmail) {
  logStep(`Adding ${memberEmail} to group...`);
  
  const session = userSessions[userEmail];
  if (!session) {
    logError(`No session found for ${userEmail}`);
    return false;
  }

  const response = await makeRequest(`/groups/${groupId}/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    },
    body: JSON.stringify({
      email: memberEmail
    })
  });

  if (response.status === 201) {
    logSuccess(`${memberEmail} added to group successfully`);
    return true;
  } else {
    logError(`Failed to add member: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function createExpense(userEmail, groupId, expenseData) {
  logStep(`Creating expense: ${expenseData.title}`);
  
  const session = userSessions[userEmail];
  if (!session) {
    logError(`No session found for ${userEmail}`);
    return null;
  }

  const response = await makeRequest(`/groups/${groupId}/expenses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    },
    body: JSON.stringify(expenseData)
  });

  if (response.status === 201) {
    logSuccess(`Expense "${expenseData.title}" created successfully`);
    logInfo(`  Expense ID: ${response.data.data.id}`);
    logInfo(`  Amount: ${response.data.data.amount} ${response.data.data.currency}`);
    logInfo(`  Split Type: ${response.data.data.splitType}`);
    return response.data.data;
  } else {
    logError(`Expense creation failed: ${response.data.message || 'Unknown error'}`);
    return null;
  }
}

async function getGroupBalances(userEmail, groupId) {
  logStep(`Getting group balances...`);
  
  const session = userSessions[userEmail];
  if (!session) {
    logError(`No session found for ${userEmail}`);
    return null;
  }

  const response = await makeRequest(`/groups/${groupId}/balances`, {
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    }
  });

  if (response.status === 200) {
    logSuccess('Group balances retrieved successfully');
    if (response.data.data && response.data.data.balances) {
      response.data.data.balances.forEach(balance => {
        logInfo(`  ${balance.userName}: ${balance.displayAmount}`);
      });
    }
    return response.data.data;
  } else {
    logError(`Failed to get balances: ${response.data.message || 'Unknown error'}`);
    return null;
  }
}

async function getGroupDebts(userEmail, groupId) {
  logStep(`Getting group debts...`);
  
  const session = userSessions[userEmail];
  if (!session) {
    logError(`No session found for ${userEmail}`);
    return null;
  }

  const response = await makeRequest(`/groups/${groupId}/debts`, {
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    }
  });

  if (response.status === 200) {
    logSuccess('Group debts retrieved successfully');
    if (response.data.data) {
      response.data.data.forEach(debt => {
        logInfo(`  ${debt.from} owes ${debt.to}: ${debt.amount} ${debt.currency}`);
      });
    }
    return response.data.data;
  } else {
    logError(`Failed to get debts: ${response.data.message || 'Unknown error'}`);
    return null;
  }
}

async function getExchangeRates() {
  logStep('Getting exchange rates...');
  
  const response = await makeRequest('/exchange-rates?fromCurrency=USD&toCurrency=EUR');
  
  if (response.status === 200) {
    logSuccess('Exchange rates retrieved successfully');
    logInfo(`  Rate: ${response.data.data.rate}`);
    return response.data.data;
  } else {
    logError(`Failed to get exchange rates: ${response.data.message || 'Unknown error'}`);
    return null;
  }
}

async function convertCurrency(amount, fromCurrency, toCurrency) {
  logStep(`Converting ${amount} ${fromCurrency} to ${toCurrency}...`);
  
  const response = await makeRequest('/convert', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      fromCurrency,
      toCurrency
    })
  });

  if (response.status === 200) {
    logSuccess(`Currency conversion successful: ${response.data.data.displayAmount}`);
    return response.data.data;
  } else {
    logError(`Currency conversion failed: ${response.data.message || 'Unknown error'}`);
    return null;
  }
}

async function getAuditHistory(userEmail, groupId) {
  logStep(`Getting audit history for group ${groupId}...`);
  
  const session = userSessions[userEmail];
  if (!session) {
    logError(`No session found for ${userEmail}`);
    return null;
  }

  const response = await makeRequest(`/audit/groups/${groupId}/history`, {
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    }
  });

  if (response.status === 200) {
    logSuccess('Audit history retrieved successfully');
    if (response.data.data) {
      logInfo(`  Audit entries: ${response.data.data.length}`);
    }
    return response.data.data;
  } else {
    logError(`Failed to get audit history: ${response.data.message || 'Unknown error'}`);
    return null;
  }
}

// Real-life scenarios
async function scenario1_BasicUserOperations() {
  logScenario('Scenario 1: Basic User Operations');
  logInfo('Testing basic user authentication and profile management');
  
  // Step 1: Sign in working user
  const signinResult = await signinWorkingUser();
  if (!signinResult) return false;
  
  // Step 2: Get current user info
  const userInfo = await getCurrentUser(workingUser.email);
  if (!userInfo) return false;
  
  // Step 3: Update user profile
  const updateResult = await updateUserProfile(workingUser.email, {
    name: 'Nikhil Nishad (Updated)',
    preferredCurrency: 'USD'
  });
  if (!updateResult) return false;
  
  // Step 4: Verify update
  const updatedUserInfo = await getCurrentUser(workingUser.email);
  if (!updatedUserInfo) return false;
  
  return true;
}

async function scenario2_GroupCreationAndManagement() {
  logScenario('Scenario 2: Group Creation and Management');
  logInfo('Testing group creation and member management');
  
  // Step 1: Create a group
  const group = await createGroup(workingUser.email, {
    name: 'Test Group',
    description: 'A test group for API testing',
    defaultCurrency: 'USD'
  });
  
  if (!group) return false;
  
  // Step 2: Try to add a member (this might fail if the user doesn't exist)
  // We'll skip this for now since we don't have other users created
  logInfo('Skipping member addition since other users are not created');
  
  return true;
}

async function scenario3_ExpenseCreation() {
  logScenario('Scenario 3: Expense Creation');
  logInfo('Testing expense creation and management');
  
  // Step 1: Create a group first
  const group = await createGroup(workingUser.email, {
    name: 'Expense Test Group',
    description: 'Group for testing expenses',
    defaultCurrency: 'USD'
  });
  
  if (!group) return false;
  
  // Step 2: Create an expense
  const expense = await createExpense(workingUser.email, group.id, {
    title: 'Test Expense',
    amount: 100,
    currency: 'USD',
    splitType: 'EQUAL',
    description: 'A test expense for API testing',
    category: 'Food'
  });
  
  if (!expense) return false;
  
  // Step 3: Get group balances
  const balances = await getGroupBalances(workingUser.email, group.id);
  if (!balances) return false;
  
  // Step 4: Get group debts
  const debts = await getGroupDebts(workingUser.email, group.id);
  if (!debts) return false;
  
  return true;
}

async function scenario4_CurrencyFeatures() {
  logScenario('Scenario 4: Currency Features');
  logInfo('Testing currency conversion and exchange rate features');
  
  // Step 1: Get exchange rates
  const exchangeRates = await getExchangeRates();
  if (!exchangeRates) return false;
  
  // Step 2: Convert currency
  const conversion = await convertCurrency(100, 'USD', 'EUR');
  if (!conversion) return false;
  
  return true;
}

async function scenario5_AuditTrail() {
  logScenario('Scenario 5: Audit Trail');
  logInfo('Testing audit trail and history features');
  
  // Step 1: Create a group for audit testing
  const group = await createGroup(workingUser.email, {
    name: 'Audit Test Group',
    description: 'Group for testing audit features',
    defaultCurrency: 'USD'
  });
  
  if (!group) return false;
  
  // Step 2: Create an expense to generate audit entries
  const expense = await createExpense(workingUser.email, group.id, {
    title: 'Audit Test Expense',
    amount: 50,
    currency: 'USD',
    splitType: 'EQUAL',
    description: 'An expense for testing audit trail',
    category: 'Transportation'
  });
  
  if (!expense) return false;
  
  // Step 3: Get audit history
  const auditHistory = await getAuditHistory(workingUser.email, group.id);
  if (!auditHistory) return false;
  
  return true;
}

async function runAllScenarios() {
  log('🚀 Starting Working User API Tests', 'bold');
  log('==================================', 'bold');
  
  // Check server health first
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    logError('Server health check failed. Please ensure the server is running.');
    return;
  }
  
  const scenarios = [
    { name: 'Basic User Operations', fn: scenario1_BasicUserOperations },
    { name: 'Group Creation and Management', fn: scenario2_GroupCreationAndManagement },
    { name: 'Expense Creation', fn: scenario3_ExpenseCreation },
    { name: 'Currency Features', fn: scenario4_CurrencyFeatures },
    { name: 'Audit Trail', fn: scenario5_AuditTrail }
  ];

  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    log(`\n🎭 Running Scenario: ${scenario.name}`, 'bold');
    try {
      const result = await scenario.fn();
      if (result) {
        passed++;
        logSuccess(`✅ Scenario "${scenario.name}" completed successfully`);
      } else {
        failed++;
        logError(`❌ Scenario "${scenario.name}" failed`);
      }
    } catch (error) {
      failed++;
      logError(`❌ Scenario "${scenario.name}" failed with error: ${error.message}`);
    }
  }

  log('\n📊 Scenario Test Results', 'bold');
  log('=======================', 'bold');
  logSuccess(`Passed: ${passed}`);
  if (failed > 0) {
    logError(`Failed: ${failed}`);
  }
  
  const total = passed + failed;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  if (percentage === '100.0') {
    logSuccess(`All scenarios passed! (${percentage}%)`);
  } else {
    logWarning(`Scenario completion: ${percentage}%`);
  }
  
  // Summary of user sessions
  log('\n👥 User Sessions Summary', 'bold');
  log('========================', 'bold');
  Object.keys(userSessions).forEach(email => {
    const session = userSessions[email];
    logInfo(`${email}: ${session.user.name} (${session.user.preferredCurrency})`);
  });
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      return true;
    }
  } catch (error) {
    // Server not running
  }
  return false;
}

async function main() {
  log('🔍 Checking if server is running...', 'bold');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    logError('Server is not running on http://localhost:3000');
    logInfo('Please start the server with: npm run dev');
    process.exit(1);
  }
  
  logSuccess('Server is running on http://localhost:3000');
  
  await runAllScenarios();
}

main().catch(console.error); 