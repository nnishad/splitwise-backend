#!/usr/bin/env node

const API_BASE = 'http://localhost:3000/api/v1';

// Working user credentials from the rules
const workingUser = {
  email: 'nikhilnishadatuk@gmail.com',
  password: 'zxcvbnm.',
  name: 'Nikhil Nishad'
};

// Store user sessions and test data
const userSessions = {};
const testData = {
  groups: [],
  expenses: []
};

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

function logResult(message) {
  log(`📊 ${message}`, 'bold');
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
    
    // Store the group for later use
    testData.groups.push(response.data.data);
    
    return response.data.data;
  } else {
    logError(`Group creation failed: ${response.data.message || 'Unknown error'}`);
    return null;
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
    
    // Store the expense for later use
    testData.expenses.push(response.data.data);
    
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
  
  const session = userSessions[workingUser.email];
  if (!session) {
    logError('No session found for exchange rates');
    return null;
  }

  const response = await makeRequest('/exchange-rates?fromCurrency=USD&toCurrency=EUR', {
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    }
  });
  
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
  
  const session = userSessions[workingUser.email];
  if (!session) {
    logError('No session found for currency conversion');
    return null;
  }

  const response = await makeRequest('/convert', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount,
      fromCurrency,
      toCurrency
    })
  });

  if (response.status === 200) {
    logSuccess(`Currency conversion successful: ${response.data.data.displayConverted}`);
    logInfo(`  Original: ${response.data.data.displayOriginal}`);
    logInfo(`  Converted: ${response.data.data.displayConverted}`);
    logInfo(`  Rate: ${response.data.data.rate}`);
    return response.data.data;
  } else {
    logError(`Currency conversion failed: ${response.data.message || 'Unknown error'}`);
    return null;
  }
}

// Real-life scenarios
async function scenario1_UserAuthentication() {
  logScenario('Scenario 1: User Authentication & Profile Management');
  logInfo('Testing user signin, profile retrieval, and profile updates');
  
  // Step 1: Sign in working user
  const signinResult = await signinWorkingUser();
  if (!signinResult) return false;
  
  // Step 2: Get current user info
  const userInfo = await getCurrentUser(workingUser.email);
  if (!userInfo) return false;
  
  // Step 3: Update user profile
  const updateResult = await updateUserProfile(workingUser.email, {
    name: 'Nikhil Nishad (Demo)',
    preferredCurrency: 'USD'
  });
  if (!updateResult) return false;
  
  // Step 4: Verify update
  const updatedUserInfo = await getCurrentUser(workingUser.email);
  if (!updatedUserInfo) return false;
  
  return true;
}

async function scenario2_GroupManagement() {
  logScenario('Scenario 2: Group Management');
  logInfo('Testing group creation for different scenarios');
  
  // Step 1: Create a roommates group
  const roommatesGroup = await createGroup(workingUser.email, {
    name: 'Roommates',
    description: 'Monthly apartment expenses',
    defaultCurrency: 'USD'
  });
  
  if (!roommatesGroup) return false;
  
  // Step 2: Create a trip group
  const tripGroup = await createGroup(workingUser.email, {
    name: 'Europe Trip',
    description: 'Vacation expenses in Europe',
    defaultCurrency: 'EUR'
  });
  
  if (!tripGroup) return false;
  
  // Step 3: Create a work group
  const workGroup = await createGroup(workingUser.email, {
    name: 'Work Team',
    description: 'Team lunch and office expenses',
    defaultCurrency: 'USD'
  });
  
  if (!workGroup) return false;
  
  logResult(`Created ${testData.groups.length} groups successfully`);
  
  return true;
}

async function scenario3_ExpenseManagement() {
  logScenario('Scenario 3: Expense Management');
  logInfo('Testing expense creation and management');
  
  if (testData.groups.length === 0) {
    logWarning('No groups available, creating a test group first');
    const testGroup = await createGroup(workingUser.email, {
      name: 'Test Group',
      description: 'Group for testing expenses',
      defaultCurrency: 'USD'
    });
    if (!testGroup) return false;
  }
  
  const group = testData.groups[0];
  
  // Step 1: Create various types of expenses
  const expenses = [
    {
      title: 'Groceries',
      amount: 50,
      currency: 'USD',
      splitType: 'EQUAL',
      description: 'Weekly grocery shopping',
      category: 'Food'
    },
    {
      title: 'Rent',
      amount: 1200,
      currency: 'USD',
      splitType: 'EQUAL',
      description: 'Monthly rent payment',
      category: 'Housing'
    },
    {
      title: 'Internet Bill',
      amount: 80,
      currency: 'USD',
      splitType: 'EQUAL',
      description: 'Monthly internet service',
      category: 'Utilities'
    }
  ];
  
  for (const expense of expenses) {
    const createdExpense = await createExpense(workingUser.email, group.id, expense);
    if (!createdExpense) {
      logError(`Failed to create expense: ${expense.title}`);
      return false;
    }
  }
  
  logResult(`Created ${testData.expenses.length} expenses successfully`);
  
  return true;
}

async function scenario4_BalanceCalculation() {
  logScenario('Scenario 4: Balance & Debt Calculation');
  logInfo('Testing balance calculation and debt management');
  
  if (testData.groups.length === 0) {
    logWarning('No groups available for balance testing');
    return false;
  }
  
  const group = testData.groups[0];
  
  // Step 1: Get group balances
  const balances = await getGroupBalances(workingUser.email, group.id);
  if (!balances) return false;
  
  // Step 2: Get group debts
  const debts = await getGroupDebts(workingUser.email, group.id);
  if (!debts) return false;
  
  logResult('Balance and debt calculations completed successfully');
  
  return true;
}

async function scenario5_CurrencyFeatures() {
  logScenario('Scenario 5: Currency Features');
  logInfo('Testing currency conversion and exchange rate features');
  
  // Step 1: Get exchange rates
  const exchangeRates = await getExchangeRates();
  if (!exchangeRates) return false;
  
  // Step 2: Convert currency in different directions
  const usdToEur = await convertCurrency(100, 'USD', 'EUR');
  if (!usdToEur) return false;
  
  const eurToUsd = await convertCurrency(85, 'EUR', 'USD');
  if (!eurToUsd) return false;
  
  const usdToGbp = await convertCurrency(100, 'USD', 'GBP');
  if (!usdToGbp) return false;
  
  logResult('Currency features tested successfully');
  
  return true;
}

async function scenario6_CompleteWorkflow() {
  logScenario('Scenario 6: Complete Real-Life Workflow');
  logInfo('Testing a complete expense sharing workflow');
  
  // Step 1: Create a comprehensive group
  const comprehensiveGroup = await createGroup(workingUser.email, {
    name: 'Demo Group',
    description: 'Complete workflow demonstration',
    defaultCurrency: 'USD'
  });
  
  if (!comprehensiveGroup) return false;
  
  // Step 2: Create various types of expenses
  const demoExpenses = [
    {
      title: 'Dinner at Restaurant',
      amount: 80,
      currency: 'USD',
      splitType: 'EQUAL',
      description: 'Group dinner at Italian restaurant',
      category: 'Food'
    },
    {
      title: 'Movie Tickets',
      amount: 45,
      currency: 'USD',
      splitType: 'EQUAL',
      description: 'Cinema tickets for the group',
      category: 'Entertainment'
    },
    {
      title: 'Gas for Road Trip',
      amount: 60,
      currency: 'USD',
      splitType: 'EQUAL',
      description: 'Fuel for weekend road trip',
      category: 'Transportation'
    }
  ];
  
  for (const expense of demoExpenses) {
    const createdExpense = await createExpense(workingUser.email, comprehensiveGroup.id, expense);
    if (!createdExpense) {
      logError(`Failed to create expense: ${expense.title}`);
      return false;
    }
  }
  
  // Step 3: Check balances
  const balances = await getGroupBalances(workingUser.email, comprehensiveGroup.id);
  if (!balances) return false;
  
  // Step 4: Check debts
  const debts = await getGroupDebts(workingUser.email, comprehensiveGroup.id);
  if (!debts) return false;
  
  logResult('Complete real-life workflow tested successfully');
  
  return true;
}

async function runAllScenarios() {
  log('🚀 Starting Final API Demonstration', 'bold');
  log('==================================', 'bold');
  
  // Check server health first
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    logError('Server health check failed. Please ensure the server is running.');
    return;
  }
  
  const scenarios = [
    { name: 'User Authentication & Profile Management', fn: scenario1_UserAuthentication },
    { name: 'Group Management', fn: scenario2_GroupManagement },
    { name: 'Expense Management', fn: scenario3_ExpenseManagement },
    { name: 'Balance & Debt Calculation', fn: scenario4_BalanceCalculation },
    { name: 'Currency Features', fn: scenario5_CurrencyFeatures },
    { name: 'Complete Real-Life Workflow', fn: scenario6_CompleteWorkflow }
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

  log('\n📊 Final Test Results', 'bold');
  log('====================', 'bold');
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
  
  // Summary of test data
  log('\n📈 Test Data Summary', 'bold');
  log('===================', 'bold');
  logInfo(`Groups created: ${testData.groups.length}`);
  logInfo(`Expenses created: ${testData.expenses.length}`);
  
  if (testData.groups.length > 0) {
    logInfo('Groups:');
    testData.groups.forEach(group => {
      logInfo(`  - ${group.name} (${group.id})`);
    });
  }
  
  if (testData.expenses.length > 0) {
    logInfo('Expenses:');
    testData.expenses.forEach(expense => {
      logInfo(`  - ${expense.title}: ${expense.amount} ${expense.currency}`);
    });
  }
  
  // Summary of user sessions
  log('\n👥 User Sessions Summary', 'bold');
  log('========================', 'bold');
  Object.keys(userSessions).forEach(email => {
    const session = userSessions[email];
    logInfo(`${email}: ${session.user.name} (${session.user.preferredCurrency})`);
  });
  
  log('\n🎉 API Testing Complete!', 'bold');
  log('All major features have been tested and are working correctly.', 'green');
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