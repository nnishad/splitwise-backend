const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_CREDENTIALS = {
  email: 'nikhilnishadatuk@gmail.com',
  password: 'zxcvbnm.'
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to log test results
function logTestResult(testName, success, error = null) {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  
  if (success) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message || error });
    }
  }
}

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
}

// Test Authentication Flow
async function testAuthenticationFlow() {
  console.log('\n🔐 TESTING AUTHENTICATION FLOW');
  console.log('================================');

  // Test 1: Sign in with valid credentials
  console.log('\n1. Testing sign in with valid credentials...');
  const signInResponse = await makeAuthenticatedRequest('POST', '/auth/signin', {
    email: TEST_CREDENTIALS.email,
    password: TEST_CREDENTIALS.password
  });

  if (!signInResponse.success) {
    logTestResult('Sign in with valid credentials', false, signInResponse.error);
    console.log('❌ Cannot proceed with other tests without authentication');
    return null;
  }

  logTestResult('Sign in with valid credentials', true);
  const accessToken = signInResponse.data.session.access_token;
  const userId = signInResponse.data.user.id;
  console.log(`   Access token obtained: ${accessToken.substring(0, 20)}...`);
  console.log(`   User ID: ${userId}`);

  // Test 2: Get current user with token
  console.log('\n2. Testing get current user...');
  const meResponse = await makeAuthenticatedRequest('GET', '/auth/me', null, accessToken);
  logTestResult('Get current user', meResponse.success, meResponse.error);

  return { accessToken, userId };
}

// Test User Management Endpoints
async function testUserEndpoints(token) {
  console.log('\n👤 TESTING USER MANAGEMENT ENDPOINTS');
  console.log('=====================================');

  // Test 1: Get current user profile
  console.log('\n1. Testing get current user profile...');
  const meResponse = await makeAuthenticatedRequest('GET', '/users/me', null, token);
  logTestResult('GET /users/me', meResponse.success, meResponse.error);

  // Test 2: Update user profile
  console.log('\n2. Testing update user profile...');
  const updateData = {
    name: 'Updated Test User',
    preferredCurrency: 'EUR'
  };
  const updateResponse = await makeAuthenticatedRequest('PUT', '/users/me', updateData, token);
  logTestResult('PUT /users/me', updateResponse.success, updateResponse.error);

  // Test 3: Update profile via auth endpoint
  console.log('\n3. Testing update profile via auth endpoint...');
  const authUpdateResponse = await makeAuthenticatedRequest('PUT', '/auth/profile', updateData, token);
  logTestResult('PUT /auth/profile', authUpdateResponse.success, authUpdateResponse.error);

  // Test 4: Get current user via auth endpoint
  console.log('\n4. Testing get current user via auth endpoint...');
  const authMeResponse = await makeAuthenticatedRequest('GET', '/auth/me', null, token);
  logTestResult('GET /auth/me', authMeResponse.success, authMeResponse.error);
}

// Test Group Management Endpoints
async function testGroupEndpoints(token) {
  console.log('\n👥 TESTING GROUP MANAGEMENT ENDPOINTS');
  console.log('=====================================');

  // Test 1: Create a new group
  console.log('\n1. Testing create group...');
  const createGroupData = {
    name: 'Test Group',
    description: 'A test group for API testing',
    currency: 'USD'
  };
  const createGroupResponse = await makeAuthenticatedRequest('POST', '/groups', createGroupData, token);
  logTestResult('POST /groups', createGroupResponse.success, createGroupResponse.error);

  let groupId = null;
  if (createGroupResponse.success) {
    groupId = createGroupResponse.data.data.id;
    console.log(`   Group created with ID: ${groupId}`);
  }

  // Test 2: Get all groups
  console.log('\n2. Testing get all groups...');
  const getGroupsResponse = await makeAuthenticatedRequest('GET', '/groups', null, token);
  logTestResult('GET /groups', getGroupsResponse.success, getGroupsResponse.error);

  // Test 3: Get specific group (if group was created)
  if (groupId) {
    console.log('\n3. Testing get specific group...');
    const getGroupResponse = await makeAuthenticatedRequest('GET', `/groups/${groupId}`, null, token);
    logTestResult(`GET /groups/${groupId}`, getGroupResponse.success, getGroupResponse.error);

    // Test 4: Update group
    console.log('\n4. Testing update group...');
    const updateGroupData = {
      name: 'Updated Test Group',
      description: 'Updated description'
    };
    const updateGroupResponse = await makeAuthenticatedRequest('PUT', `/groups/${groupId}`, updateGroupData, token);
    logTestResult(`PUT /groups/${groupId}`, updateGroupResponse.success, updateGroupResponse.error);

    return groupId;
  }

  return null;
}

// Test Expense Management Endpoints
async function testExpenseEndpoints(token, groupId, userId) {
  console.log('\n💰 TESTING EXPENSE MANAGEMENT ENDPOINTS');
  console.log('=======================================');

  if (!groupId) {
    console.log('❌ Skipping expense tests - no group available');
    return null;
  }

  // Test 1: Create an expense
  console.log('\n1. Testing create expense...');
  const createExpenseData = {
    title: 'Test Expense',
    amount: 50.00,
    description: 'A test expense for API testing',
    date: new Date().toISOString(),
    splitType: 'EQUAL',
    splits: [
      {
        userId: userId,
        amount: 25.00,
        percentage: 50
      }
    ],
    payers: [
      {
        userId: userId,
        amount: 50.00
      }
    ]
  };
  const createExpenseResponse = await makeAuthenticatedRequest('POST', `/groups/${groupId}/expenses`, createExpenseData, token);
  logTestResult(`POST /groups/${groupId}/expenses`, createExpenseResponse.success, createExpenseResponse.error);

  let expenseId = null;
  if (createExpenseResponse.success) {
    expenseId = createExpenseResponse.data.data.id;
    console.log(`   Expense created with ID: ${expenseId}`);
  }

  // Test 2: Get all expenses for group
  console.log('\n2. Testing get group expenses...');
  const getExpensesResponse = await makeAuthenticatedRequest('GET', `/groups/${groupId}/expenses`, null, token);
  logTestResult(`GET /groups/${groupId}/expenses`, getExpensesResponse.success, getExpensesResponse.error);

  // Test 3: Get specific expense (if expense was created)
  if (expenseId) {
    console.log('\n3. Testing get specific expense...');
    const getExpenseResponse = await makeAuthenticatedRequest('GET', `/expenses/${expenseId}`, null, token);
    logTestResult(`GET /expenses/${expenseId}`, getExpenseResponse.success, getExpenseResponse.error);

    // Test 4: Update expense
    console.log('\n4. Testing update expense...');
    const updateExpenseData = {
      title: 'Updated Test Expense',
      amount: 60.00,
      description: 'Updated description'
    };
    const updateExpenseResponse = await makeAuthenticatedRequest('PUT', `/expenses/${expenseId}`, updateExpenseData, token);
    logTestResult(`PUT /expenses/${expenseId}`, updateExpenseResponse.success, updateExpenseResponse.error);

    return expenseId;
  }

  return null;
}

// Test Balance and Settlement Endpoints
async function testBalanceEndpoints(token, groupId, userId) {
  console.log('\n⚖️ TESTING BALANCE AND SETTLEMENT ENDPOINTS');
  console.log('============================================');

  if (!groupId) {
    console.log('❌ Skipping balance tests - no group available');
    return;
  }

  // Test 1: Get group balances
  console.log('\n1. Testing get group balances...');
  const getBalancesResponse = await makeAuthenticatedRequest('GET', `/groups/${groupId}/balances`, null, token);
  logTestResult(`GET /groups/${groupId}/balances`, getBalancesResponse.success, getBalancesResponse.error);

  // Test 2: Get settlements
  console.log('\n2. Testing get settlements...');
  const getSettlementsResponse = await makeAuthenticatedRequest('GET', `/groups/${groupId}/settlements`, null, token);
  logTestResult(`GET /groups/${groupId}/settlements`, getSettlementsResponse.success, getSettlementsResponse.error);

  // Test 3: Create settlement
  console.log('\n3. Testing create settlement...');
  const createSettlementData = {
    fromUserId: userId,
    toUserId: userId,
    amount: 25.00,
    currency: 'USD',
    notes: 'Test settlement'
  };
  const createSettlementResponse = await makeAuthenticatedRequest('POST', `/groups/${groupId}/settlements`, createSettlementData, token);
  logTestResult(`POST /groups/${groupId}/settlements`, createSettlementResponse.success, createSettlementResponse.error);
}

// Test Exchange Rate Endpoints
async function testExchangeRateEndpoints(token) {
  console.log('\n💱 TESTING EXCHANGE RATE ENDPOINTS');
  console.log('===================================');

  // Test 1: Get exchange rates
  console.log('\n1. Testing get exchange rates...');
  const getRatesResponse = await makeAuthenticatedRequest('GET', '/exchange-rates?fromCurrency=USD&toCurrency=EUR', null, token);
  logTestResult('GET /exchange-rates', getRatesResponse.success, getRatesResponse.error);

  // Test 2: Get supported currencies
  console.log('\n2. Testing get supported currencies...');
  const getCurrenciesResponse = await makeAuthenticatedRequest('GET', '/currencies', null, token);
  logTestResult('GET /currencies', getCurrenciesResponse.success, getCurrenciesResponse.error);
}

// Test Audit Endpoints
async function testAuditEndpoints(token) {
  console.log('\n📊 TESTING AUDIT ENDPOINTS');
  console.log('===========================');

  // Test 1: Get audit history
  console.log('\n1. Testing get audit history...');
  const getAuditResponse = await makeAuthenticatedRequest('GET', '/audit/history', null, token);
  logTestResult('GET /audit/history', getAuditResponse.success, getAuditResponse.error);

  // Test 2: Get audit history with filters
  console.log('\n2. Testing get audit history with filters...');
  const getAuditFilteredResponse = await makeAuthenticatedRequest('GET', '/audit/history?entityType=user&limit=10', null, token);
  logTestResult('GET /audit/history with filters', getAuditFilteredResponse.success, getAuditFilteredResponse.error);
}

// Test Error Scenarios
async function testErrorScenarios(token) {
  console.log('\n🚨 TESTING ERROR SCENARIOS');
  console.log('===========================');

  // Test 1: Access protected endpoint without token
  console.log('\n1. Testing access without token...');
  const noTokenResponse = await makeAuthenticatedRequest('GET', '/users/me');
  logTestResult('Access without token', !noTokenResponse.success && noTokenResponse.status === 401);

  // Test 2: Access with invalid token
  console.log('\n2. Testing access with invalid token...');
  const invalidTokenResponse = await makeAuthenticatedRequest('GET', '/users/me', null, 'invalid-token');
  logTestResult('Access with invalid token', !invalidTokenResponse.success && invalidTokenResponse.status === 401);

  // Test 3: Access non-existent resource
  console.log('\n3. Testing access non-existent resource...');
  const notFoundResponse = await makeAuthenticatedRequest('GET', '/groups/non-existent-id', null, token);
  logTestResult('Access non-existent resource', !notFoundResponse.success && notFoundResponse.status === 404);

  // Test 4: Invalid request data
  console.log('\n4. Testing invalid request data...');
  const invalidDataResponse = await makeAuthenticatedRequest('POST', '/groups', { invalid: 'data' }, token);
  logTestResult('Invalid request data', !invalidDataResponse.success && invalidDataResponse.status === 400);
}

// Test Authentication Edge Cases
async function testAuthEdgeCases() {
  console.log('\n🔍 TESTING AUTHENTICATION EDGE CASES');
  console.log('=====================================');

  // Test 1: Sign in with invalid credentials
  console.log('\n1. Testing sign in with invalid credentials...');
  const invalidSignInResponse = await makeAuthenticatedRequest('POST', '/auth/signin', {
    email: 'invalid@example.com',
    password: 'wrongpassword'
  });
  logTestResult('Sign in with invalid credentials', !invalidSignInResponse.success && invalidSignInResponse.status === 401);

  // Test 2: Sign in with malformed data
  console.log('\n2. Testing sign in with malformed data...');
  const malformedSignInResponse = await makeAuthenticatedRequest('POST', '/auth/signin', {
    email: 'not-an-email',
    password: ''
  });
  logTestResult('Sign in with malformed data', !malformedSignInResponse.success && malformedSignInResponse.status === 400);

  // Test 3: Access auth endpoint without required fields
  console.log('\n3. Testing auth endpoint without required fields...');
  const missingFieldsResponse = await makeAuthenticatedRequest('POST', '/auth/signin', {
    email: 'test@example.com'
    // Missing password
  });
  logTestResult('Auth endpoint without required fields', !missingFieldsResponse.success && missingFieldsResponse.status === 400);
}

// Main test runner
async function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE ENDPOINT TESTING');
  console.log('==========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test User: ${TEST_CREDENTIALS.email}`);

  try {
    // Step 1: Test authentication flow
    const authResult = await testAuthenticationFlow();
    
    if (!authResult) {
      console.log('\n❌ Authentication failed. Cannot proceed with other tests.');
      return;
    }

    const { accessToken, userId } = authResult;

    // Step 2: Test all endpoint categories
    await testUserEndpoints(accessToken);
    const groupId = await testGroupEndpoints(accessToken);
    const expenseId = await testExpenseEndpoints(accessToken, groupId, userId);
    await testBalanceEndpoints(accessToken, groupId, userId);
    await testExchangeRateEndpoints(accessToken);
    await testAuditEndpoints(accessToken);
    
    // Step 3: Test error scenarios
    await testErrorScenarios(accessToken);
    await testAuthEdgeCases();

    // Step 4: Print summary
    console.log('\n📊 TEST SUMMARY');
    console.log('===============');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    if (testResults.errors.length > 0) {
      console.log('\n🚨 ERRORS FOUND:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.error}`);
      });
    }

    if (testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Your API is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the errors above.');
    }

  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
runAllTests(); 