#!/usr/bin/env node

const API_BASE = 'http://localhost:3000/api/v1';

// Real-life user scenarios
const users = [
  {
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    password: 'securepass123',
    preferredCurrency: 'USD'
  },
  {
    name: 'Bob Smith',
    email: 'bob.smith@example.com', 
    password: 'securepass123',
    preferredCurrency: 'EUR'
  },
  {
    name: 'Carol Davis',
    email: 'carol.davis@example.com',
    password: 'securepass123',
    preferredCurrency: 'GBP'
  },
  {
    name: 'David Wilson',
    email: 'david.wilson@example.com',
    password: 'securepass123',
    preferredCurrency: 'CAD'
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

async function signupUser(userData) {
  logStep(`Signing up ${userData.name}...`);
  
  const response = await makeRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData)
  });

  if (response.status === 201) {
    logSuccess(`${userData.name} signed up successfully`);
    if (response.data.session) {
      userSessions[userData.email] = {
        accessToken: response.data.session.access_token,
        refreshToken: response.data.session.refresh_token,
        user: response.data.user
      };
    }
    return true;
  } else {
    logError(`${userData.name} signup failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function signinUser(userData) {
  logStep(`Signing in ${userData.name}...`);
  
  const response = await makeRequest('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({
      email: userData.email,
      password: userData.password
    })
  });

  if (response.status === 200) {
    logSuccess(`${userData.name} signed in successfully`);
    if (response.data.session) {
      userSessions[userData.email] = {
        accessToken: response.data.session.access_token,
        refreshToken: response.data.session.refresh_token,
        user: response.data.user
      };
    }
    return true;
  } else {
    logError(`${userData.name} signin failed: ${response.data.message || 'Unknown error'}`);
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
    return response.data.data;
  } else {
    logError(`Failed to get debts: ${response.data.message || 'Unknown error'}`);
    return null;
  }
}

async function createSettlement(userEmail, groupId, settlementData) {
  logStep(`Creating settlement...`);
  
  const session = userSessions[userEmail];
  if (!session) {
    logError(`No session found for ${userEmail}`);
    return null;
  }

  const response = await makeRequest(`/groups/${groupId}/settlements`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    },
    body: JSON.stringify(settlementData)
  });

  if (response.status === 201) {
    logSuccess('Settlement created successfully');
    return response.data.data;
  } else {
    logError(`Settlement creation failed: ${response.data.message || 'Unknown error'}`);
    return null;
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
    return true;
  } else {
    logError(`Profile update failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function getExchangeRates() {
  logStep('Getting exchange rates...');
  
  const response = await makeRequest('/exchange-rates?fromCurrency=USD&toCurrency=EUR');
  
  if (response.status === 200) {
    logSuccess('Exchange rates retrieved successfully');
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
    return response.data.data;
  } else {
    logError(`Failed to get audit history: ${response.data.message || 'Unknown error'}`);
    return null;
  }
}

// Real-life scenarios
async function scenario1_RoommatesSharingExpenses() {
  logScenario('Scenario 1: Roommates Sharing Expenses');
  logInfo('Alice, Bob, Carol, and David are roommates sharing apartment expenses');
  
  // Step 1: All users sign up
  for (const user of users) {
    await signupUser(user);
  }
  
  // Step 2: Alice creates a "Roommates" group
  const roommatesGroup = await createGroup('alice.johnson@example.com', {
    name: 'Roommates',
    description: 'Monthly apartment expenses',
    defaultCurrency: 'USD'
  });
  
  if (!roommatesGroup) return false;
  
  // Step 3: Add all members to the group
  const memberEmails = users.map(u => u.email);
  for (const email of memberEmails) {
    if (email !== 'alice.johnson@example.com') {
      await addMemberToGroup('alice.johnson@example.com', roommatesGroup.id, email);
    }
  }
  
  // Step 4: Create various expenses
  const expenses = [
    {
      title: 'Rent',
      amount: 2000,
      currency: 'USD',
      splitType: 'EQUAL',
      description: 'Monthly rent payment',
      category: 'Housing'
    },
    {
      title: 'Electricity Bill',
      amount: 150,
      currency: 'USD',
      splitType: 'EQUAL',
      description: 'Monthly electricity bill',
      category: 'Utilities'
    },
    {
      title: 'Internet Bill',
      amount: 80,
      currency: 'USD',
      splitType: 'EQUAL',
      description: 'Monthly internet service',
      category: 'Utilities'
    },
    {
      title: 'Groceries',
      amount: 300,
      currency: 'USD',
      splitType: 'EQUAL',
      description: 'Weekly grocery shopping',
      category: 'Food'
    }
  ];
  
  for (const expense of expenses) {
    await createExpense('alice.johnson@example.com', roommatesGroup.id, expense);
  }
  
  // Step 5: Check balances
  const balances = await getGroupBalances('alice.johnson@example.com', roommatesGroup.id);
  if (balances) {
    logInfo('Group balances:');
    balances.balances.forEach(balance => {
      logInfo(`  ${balance.userName}: ${balance.displayAmount}`);
    });
  }
  
  // Step 6: Check debts
  const debts = await getGroupDebts('alice.johnson@example.com', roommatesGroup.id);
  if (debts) {
    logInfo('Group debts:');
    debts.forEach(debt => {
      logInfo(`  ${debt.from} owes ${debt.to}: ${debt.amount} ${debt.currency}`);
    });
  }
  
  return true;
}

async function scenario2_TripExpenses() {
  logScenario('Scenario 2: Trip Expenses with Different Currencies');
  logInfo('Alice and Bob are on a trip to Europe, sharing expenses in multiple currencies');
  
  // Step 1: Create a trip group
  const tripGroup = await createGroup('alice.johnson@example.com', {
    name: 'Europe Trip',
    description: 'Vacation expenses in Europe',
    defaultCurrency: 'EUR'
  });
  
  if (!tripGroup) return false;
  
  // Step 2: Add Bob to the group
  await addMemberToGroup('alice.johnson@example.com', tripGroup.id, 'bob.smith@example.com');
  
  // Step 3: Create expenses in different currencies
  const tripExpenses = [
    {
      title: 'Hotel in Paris',
      amount: 200,
      currency: 'EUR',
      splitType: 'EQUAL',
      description: 'Hotel accommodation in Paris',
      category: 'Accommodation'
    },
    {
      title: 'Dinner in Rome',
      amount: 150,
      currency: 'EUR',
      splitType: 'EQUAL',
      description: 'Restaurant dinner in Rome',
      category: 'Food'
    },
    {
      title: 'Museum Tickets',
      amount: 80,
      currency: 'EUR',
      splitType: 'EQUAL',
      description: 'Museum entrance fees',
      category: 'Entertainment'
    }
  ];
  
  for (const expense of tripExpenses) {
    await createExpense('alice.johnson@example.com', tripGroup.id, expense);
  }
  
  // Step 4: Check balances in EUR
  const balances = await getGroupBalances('alice.johnson@example.com', tripGroup.id);
  if (balances) {
    logInfo('Trip balances (EUR):');
    balances.balances.forEach(balance => {
      logInfo(`  ${balance.userName}: ${balance.displayAmount}`);
    });
  }
  
  return true;
}

async function scenario3_CurrencyConversion() {
  logScenario('Scenario 3: Currency Conversion Features');
  logInfo('Testing currency conversion and exchange rate features');
  
  // Step 1: Get exchange rates
  const exchangeRates = await getExchangeRates();
  if (exchangeRates) {
    logInfo(`USD to EUR rate: ${exchangeRates.rate}`);
  }
  
  // Step 2: Convert currency
  const conversion = await convertCurrency(100, 'USD', 'EUR');
  if (conversion) {
    logInfo(`100 USD = ${conversion.displayAmount}`);
  }
  
  // Step 3: Create expense with currency conversion
  const session = userSessions['alice.johnson@example.com'];
  if (session) {
    const conversionExpense = await createExpense('alice.johnson@example.com', 'test-group-id', {
      title: 'International Purchase',
      amount: 50,
      currency: 'EUR',
      splitType: 'EQUAL',
      description: 'Purchase made in Europe',
      category: 'Shopping'
    });
    
    if (conversionExpense) {
      logSuccess('Expense with currency conversion created successfully');
    }
  }
  
  return true;
}

async function scenario4_UserProfileManagement() {
  logScenario('Scenario 4: User Profile Management');
  logInfo('Testing user profile updates and preferences');
  
  // Step 1: Get current user info
  const userInfo = await getCurrentUser('alice.johnson@example.com');
  if (userInfo) {
    logInfo(`Current user: ${userInfo.name} (${userInfo.email})`);
    logInfo(`Preferred currency: ${userInfo.preferredCurrency}`);
  }
  
  // Step 2: Update user profile
  const updateResult = await updateUserProfile('alice.johnson@example.com', {
    name: 'Alice Johnson (Updated)',
    preferredCurrency: 'GBP'
  });
  
  if (updateResult) {
    logSuccess('User profile updated successfully');
  }
  
  // Step 3: Verify update
  const updatedUserInfo = await getCurrentUser('alice.johnson@example.com');
  if (updatedUserInfo) {
    logInfo(`Updated user: ${updatedUserInfo.name}`);
    logInfo(`Updated currency: ${updatedUserInfo.preferredCurrency}`);
  }
  
  return true;
}

async function scenario5_AuditTrail() {
  logScenario('Scenario 5: Audit Trail and History');
  logInfo('Testing audit trail and expense history features');
  
  // Step 1: Get audit history for a group
  const auditHistory = await getAuditHistory('alice.johnson@example.com', 'test-group-id');
  if (auditHistory) {
    logInfo(`Audit history entries: ${auditHistory.length}`);
    auditHistory.forEach(entry => {
      logInfo(`  ${entry.action}: ${entry.description}`);
    });
  }
  
  return true;
}

async function runAllScenarios() {
  log('🚀 Starting Real-Life Scenario Tests', 'bold');
  log('====================================', 'bold');
  
  // Check server health first
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    logError('Server health check failed. Please ensure the server is running.');
    return;
  }
  
  const scenarios = [
    { name: 'Roommates Sharing Expenses', fn: scenario1_RoommatesSharingExpenses },
    { name: 'Trip Expenses with Different Currencies', fn: scenario2_TripExpenses },
    { name: 'Currency Conversion Features', fn: scenario3_CurrencyConversion },
    { name: 'User Profile Management', fn: scenario4_UserProfileManagement },
    { name: 'Audit Trail and History', fn: scenario5_AuditTrail }
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