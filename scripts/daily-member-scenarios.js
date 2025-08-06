const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_CREDENTIALS = {
  email: 'nikhilnishadatuk@gmail.com',
  password: 'zxcvbnm.'
};

const testResults = { passed: 0, failed: 0, errors: [] };

function logTestResult(testName, success, error = null) {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (success) testResults.passed++;
  else {
    testResults.failed++;
    if (error) testResults.errors.push({ test: testName, error: error.message || error });
  }
}

async function makeAuthenticatedRequest(method, endpoint, data = null, token = null) {
  const config = { method, url: `${BASE_URL}${endpoint}`, headers: { 'Content-Type': 'application/json' } };
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (data) config.data = data;
  
  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { success: false, error: error.response?.data || error.message, status: error.response?.status };
  }
}

async function runDailyMemberScenarios() {
  console.log('🎭 STARTING DAILY MEMBER SCENARIOS');
  console.log('===================================');

  try {
    // Step 1: Authentication
    console.log('\n🔐 STEP 1: User Authentication');
    const signInResponse = await makeAuthenticatedRequest('POST', '/auth/signin', {
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password
    });

    if (!signInResponse.success) {
      logTestResult('User sign in', false, signInResponse.error);
      return;
    }

    logTestResult('User sign in', true);
    const accessToken = signInResponse.data.session.access_token;
    const userId = signInResponse.data.user.id;

    // Step 2: Profile Management
    console.log('\n👤 STEP 2: Profile Management');
    const profileResponse = await makeAuthenticatedRequest('GET', '/users/me', null, accessToken);
    logTestResult('Get user profile', profileResponse.success, profileResponse.error);

    const updateProfileResponse = await makeAuthenticatedRequest('PUT', '/users/me', {
      name: 'John Daily Member',
      preferredCurrency: 'EUR'
    }, accessToken);
    logTestResult('Update user profile', updateProfileResponse.success, updateProfileResponse.error);

    // Step 3: Group Management
    console.log('\n👥 STEP 3: Group Management');
    const createGroupResponse = await makeAuthenticatedRequest('POST', '/groups', {
      name: 'Apartment Expenses',
      description: 'Monthly expenses for our apartment',
      currency: 'EUR'
    }, accessToken);
    logTestResult('Create group', createGroupResponse.success, createGroupResponse.error);

    let groupId = null;
    if (createGroupResponse.success) {
      groupId = createGroupResponse.data.data.id;
    }

    const getGroupsResponse = await makeAuthenticatedRequest('GET', '/groups', null, accessToken);
    logTestResult('Get user groups', getGroupsResponse.success, getGroupsResponse.error);

    // Step 4: Expense Management
    console.log('\n💰 STEP 4: Expense Management');
    if (groupId) {
      const createExpenseResponse = await makeAuthenticatedRequest('POST', `/groups/${groupId}/expenses`, {
        title: 'Monthly Rent',
        amount: 800.00,
        description: 'Monthly rent payment',
        date: new Date().toISOString(),
        splitType: 'EQUAL',
        splits: [{ userId: userId, amount: 400.00, percentage: 50 }],
        payers: [{ userId: userId, amount: 800.00 }]
      }, accessToken);
      logTestResult('Create expense', createExpenseResponse.success, createExpenseResponse.error);

      const getExpensesResponse = await makeAuthenticatedRequest('GET', `/groups/${groupId}/expenses`, null, accessToken);
      logTestResult('Get group expenses', getExpensesResponse.success, getExpensesResponse.error);
    }

    // Step 5: Balance and Settlement
    console.log('\n⚖️ STEP 5: Balance and Settlement');
    if (groupId) {
      const getBalancesResponse = await makeAuthenticatedRequest('GET', `/groups/${groupId}/balances`, null, accessToken);
      logTestResult('Get group balances', getBalancesResponse.success, getBalancesResponse.error);

      const createSettlementResponse = await makeAuthenticatedRequest('POST', `/groups/${groupId}/settlements`, {
        fromUserId: userId,
        toUserId: userId,
        amount: 50.00,
        currency: 'EUR',
        notes: 'Partial payment'
      }, accessToken);
      logTestResult('Create settlement', createSettlementResponse.success, createSettlementResponse.error);
    }

    // Step 6: Exchange Rates
    console.log('\n💱 STEP 6: Exchange Rates');
    const getRateResponse = await makeAuthenticatedRequest('GET', '/exchange-rates?fromCurrency=USD&toCurrency=EUR', null, accessToken);
    logTestResult('Get exchange rate', getRateResponse.success, getRateResponse.error);

    const getCurrenciesResponse = await makeAuthenticatedRequest('GET', '/currencies', null, accessToken);
    logTestResult('Get supported currencies', getCurrenciesResponse.success, getCurrenciesResponse.error);

    // Step 7: Audit and History
    console.log('\n📊 STEP 7: Audit and History');
    const getAuditResponse = await makeAuthenticatedRequest('GET', '/audit/history', null, accessToken);
    logTestResult('Get audit history', getAuditResponse.success, getAuditResponse.error);

    // Step 8: Error Handling
    console.log('\n🚨 STEP 8: Error Handling');
    const noAuthResponse = await makeAuthenticatedRequest('GET', '/users/me');
    logTestResult('Access without token', !noAuthResponse.success && noAuthResponse.status === 401);

    const invalidTokenResponse = await makeAuthenticatedRequest('GET', '/users/me', null, 'invalid-token');
    logTestResult('Access with invalid token', !invalidTokenResponse.success && invalidTokenResponse.status === 401);

    // Summary
    console.log('\n📊 SCENARIO SUMMARY');
    console.log('===================');
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
      console.log('\n🎉 All scenarios passed! The API is ready for daily use.');
    } else {
      console.log('\n⚠️ Some scenarios failed. Please review the errors above.');
    }

  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error.message);
  }
}

runDailyMemberScenarios(); 