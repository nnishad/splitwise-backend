#!/usr/bin/env node

const API_BASE = 'http://localhost:3000/api/v1';

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
  preferredCurrency: 'USD'
};

let accessToken = null;
let refreshToken = null;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

async function testSignup() {
  logInfo('Testing user signup...');
  
  const response = await makeRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(testUser)
  });

  if (response.status === 201) {
    logSuccess('Signup successful');
    if (response.data.session) {
      accessToken = response.data.session.access_token;
      refreshToken = response.data.session.refresh_token;
      logInfo(`Access token: ${accessToken.substring(0, 20)}...`);
      logInfo(`Refresh token: ${refreshToken.substring(0, 20)}...`);
    }
    return true;
  } else {
    logError(`Signup failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function testSignin() {
  logInfo('Testing user signin...');
  
  const response = await makeRequest('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password
    })
  });

  if (response.status === 200) {
    logSuccess('Signin successful');
    if (response.data.session) {
      accessToken = response.data.session.access_token;
      refreshToken = response.data.session.refresh_token;
      logInfo(`Access token: ${accessToken.substring(0, 20)}...`);
      logInfo(`Refresh token: ${refreshToken.substring(0, 20)}...`);
    }
    return true;
  } else {
    logError(`Signin failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function testGetCurrentUser() {
  logInfo('Testing get current user...');
  
  if (!accessToken) {
    logError('No access token available');
    return false;
  }

  const response = await makeRequest('/auth/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 200) {
    logSuccess('Get current user successful');
    logInfo(`User ID: ${response.data.user.id}`);
    logInfo(`User Email: ${response.data.user.email}`);
    logInfo(`User Name: ${response.data.user.name}`);
    return true;
  } else {
    logError(`Get current user failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function testUpdateProfile() {
  logInfo('Testing profile update...');
  
  if (!accessToken) {
    logError('No access token available');
    return false;
  }

  const updateData = {
    name: 'Updated Test User',
    preferredCurrency: 'EUR'
  };

  const response = await makeRequest('/auth/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(updateData)
  });

  if (response.status === 200) {
    logSuccess('Profile update successful');
    logInfo(`Updated name: ${response.data.user.name}`);
    logInfo(`Updated currency: ${response.data.user.preferredCurrency}`);
    return true;
  } else {
    logError(`Profile update failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function testRefreshToken() {
  logInfo('Testing token refresh...');
  
  if (!refreshToken) {
    logError('No refresh token available');
    return false;
  }

  const response = await makeRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refresh_token: refreshToken
    })
  });

  if (response.status === 200) {
    logSuccess('Token refresh successful');
    if (response.data.session) {
      accessToken = response.data.session.access_token;
      refreshToken = response.data.session.refresh_token;
      logInfo(`New access token: ${accessToken.substring(0, 20)}...`);
      logInfo(`New refresh token: ${refreshToken.substring(0, 20)}...`);
    }
    return true;
  } else {
    logError(`Token refresh failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function testProtectedEndpoint() {
  logInfo('Testing protected endpoint...');
  
  if (!accessToken) {
    logError('No access token available');
    return false;
  }

  const response = await makeRequest('/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 200) {
    logSuccess('Protected endpoint access successful');
    return true;
  } else {
    logError(`Protected endpoint access failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function testUnauthorizedAccess() {
  logInfo('Testing unauthorized access...');
  
  const response = await makeRequest('/users/me');

  if (response.status === 401) {
    logSuccess('Unauthorized access properly blocked');
    return true;
  } else {
    logError('Unauthorized access not properly blocked');
    return false;
  }
}

async function testSignout() {
  logInfo('Testing signout...');
  
  if (!accessToken) {
    logError('No access token available');
    return false;
  }

  const response = await makeRequest('/auth/signout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 200) {
    logSuccess('Signout successful');
    accessToken = null;
    refreshToken = null;
    return true;
  } else {
    logError(`Signout failed: ${response.data.message || 'Unknown error'}`);
    return false;
  }
}

async function runTests() {
  log('🚀 Starting Supabase Authentication Flow Tests', 'bold');
  log('===============================================', 'bold');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Signup', fn: testSignup },
    { name: 'Signin', fn: testSignin },
    { name: 'Get Current User', fn: testGetCurrentUser },
    { name: 'Update Profile', fn: testUpdateProfile },
    { name: 'Token Refresh', fn: testRefreshToken },
    { name: 'Protected Endpoint', fn: testProtectedEndpoint },
    { name: 'Unauthorized Access', fn: testUnauthorizedAccess },
    { name: 'Signout', fn: testSignout }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    log(`\n📋 Running: ${test.name}`, 'bold');
    const result = await test.fn();
    
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

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
  
  await runTests();
}

main().catch(console.error); 