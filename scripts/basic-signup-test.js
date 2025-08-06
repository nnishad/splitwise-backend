#!/usr/bin/env node

const API_BASE = 'http://localhost:3000/api/v1';

// Test users for basic functionality
const testUsers = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    preferredCurrency: 'USD'
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: 'password123',
    preferredCurrency: 'EUR'
  },
  {
    name: 'Mike Johnson',
    email: 'mike.johnson@example.com',
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

function logStep(message) {
  log(`  📋 ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
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

async function testSignup(userData) {
  logStep(`Testing signup for ${userData.name}...`);
  
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
      logInfo(`  User ID: ${response.data.user.id}`);
      logInfo(`  Email: ${response.data.user.email}`);
      logInfo(`  Preferred Currency: ${response.data.user.preferredCurrency}`);
      logInfo(`  Access Token: ${response.data.session.access_token.substring(0, 20)}...`);
    }
    return true;
  } else {
    logError(`${userData.name} signup failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function testSignin(userData) {
  logStep(`Testing signin for ${userData.name}...`);
  
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
      logInfo(`  User ID: ${response.data.user.id}`);
      logInfo(`  Access Token: ${response.data.session.access_token.substring(0, 20)}...`);
    }
    return true;
  } else {
    logError(`${userData.name} signin failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function testGetCurrentUser(userEmail) {
  logStep(`Testing get current user for ${userEmail}...`);
  
  const session = userSessions[userEmail];
  if (!session) {
    logError(`No session found for ${userEmail}`);
    return false;
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
    return true;
  } else {
    logError(`Failed to get user info: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function testUpdateProfile(userEmail, updateData) {
  logStep(`Testing profile update for ${userEmail}...`);
  
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

async function testCreateGroup(userEmail, groupData) {
  logStep(`Testing group creation for ${userEmail}...`);
  
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

async function testCreateExpense(userEmail, groupId, expenseData) {
  logStep(`Testing expense creation for ${userEmail}...`);
  
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

async function testGetGroupBalances(userEmail, groupId) {
  logStep(`Testing group balances for ${userEmail}...`);
  
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

async function testUnauthorizedAccess() {
  logStep('Testing unauthorized access...');
  
  const response = await makeRequest('/auth/me');

  if (response.status === 401) {
    logSuccess('Unauthorized access properly blocked');
    return true;
  } else {
    logError('Unauthorized access not properly blocked');
    return false;
  }
}

async function testDuplicateSignup(userData) {
  logStep(`Testing duplicate signup for ${userData.name}...`);
  
  const response = await makeRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData)
  });

  if (response.status === 400) {
    logSuccess(`Duplicate signup properly rejected for ${userData.name}`);
    return true;
  } else {
    logError(`Duplicate signup should have been rejected for ${userData.name}`);
    return false;
  }
}

async function runBasicTests() {
  log('🚀 Starting Basic Signup and API Tests', 'bold');
  log('======================================', 'bold');
  
  // Check server health first
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    logError('Server health check failed. Please ensure the server is running.');
    return;
  }
  
  let passed = 0;
  let failed = 0;

  // Test 1: Health check
  log('\n📋 Test 1: Health Check', 'bold');
  if (await testHealthCheck()) {
    passed++;
  } else {
    failed++;
  }

  // Test 2: Sign up all users
  log('\n📋 Test 2: User Signup', 'bold');
  for (const user of testUsers) {
    if (await testSignup(user)) {
      passed++;
    } else {
      failed++;
    }
  }

  // Test 3: Sign in all users
  log('\n📋 Test 3: User Signin', 'bold');
  for (const user of testUsers) {
    if (await testSignin(user)) {
      passed++;
    } else {
      failed++;
    }
  }

  // Test 4: Get current user for all users
  log('\n📋 Test 4: Get Current User', 'bold');
  for (const user of testUsers) {
    if (await testGetCurrentUser(user.email)) {
      passed++;
    } else {
      failed++;
    }
  }

  // Test 5: Update user profile
  log('\n📋 Test 5: Update User Profile', 'bold');
  const updateResult = await testUpdateProfile(testUsers[0].email, {
    name: 'John Doe (Updated)',
    preferredCurrency: 'CAD'
  });
  if (updateResult) {
    passed++;
  } else {
    failed++;
  }

  // Test 6: Create a group
  log('\n📋 Test 6: Create Group', 'bold');
  const group = await testCreateGroup(testUsers[0].email, {
    name: 'Test Group',
    description: 'A test group for API testing',
    defaultCurrency: 'USD'
  });
  if (group) {
    passed++;
  } else {
    failed++;
  }

  // Test 7: Create an expense
  if (group) {
    log('\n📋 Test 7: Create Expense', 'bold');
    const expense = await testCreateExpense(testUsers[0].email, group.id, {
      title: 'Test Expense',
      amount: 100,
      currency: 'USD',
      splitType: 'EQUAL',
      description: 'A test expense for API testing',
      category: 'Food'
    });
    if (expense) {
      passed++;
    } else {
      failed++;
    }

    // Test 8: Get group balances
    if (expense) {
      log('\n📋 Test 8: Get Group Balances', 'bold');
      const balances = await testGetGroupBalances(testUsers[0].email, group.id);
      if (balances) {
        passed++;
      } else {
        failed++;
      }
    }
  }

  // Test 9: Test unauthorized access
  log('\n📋 Test 9: Unauthorized Access', 'bold');
  if (await testUnauthorizedAccess()) {
    passed++;
  } else {
    failed++;
  }

  // Test 10: Test duplicate signup
  log('\n📋 Test 10: Duplicate Signup', 'bold');
  if (await testDuplicateSignup(testUsers[0])) {
    passed++;
  } else {
    failed++;
  }

  // Results
  log('\n📊 Test Results', 'bold');
  log('===============', 'bold');
  logSuccess(`Passed: ${passed}`);
  if (failed > 0) {
    logError(`Failed: ${failed}`);
  }
  
  const total = passed + failed;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  if (percentage === '100.0') {
    logSuccess(`All tests passed! (${percentage}%)`);
  } else {
    logWarning(`Test completion: ${percentage}%`);
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
  
  await runBasicTests();
}

main().catch(console.error); 