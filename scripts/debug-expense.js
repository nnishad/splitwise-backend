const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_CREDENTIALS = {
  email: 'nikhilnishadatuk@gmail.com',
  password: 'zxcvbnm.'
};

async function debugExpenseCreation() {
  console.log('🔍 DEBUGGING EXPENSE CREATION');
  console.log('==============================');

  try {
    // Step 1: Sign in
    console.log('\n1. Signing in...');
    const signInResponse = await axios.post(`${BASE_URL}/auth/signin`, {
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password
    });

    const accessToken = signInResponse.data.session.access_token;
    const userId = signInResponse.data.user.id;
    console.log(`✅ Signed in successfully. User ID: ${userId}`);

    // Step 2: Create a group
    console.log('\n2. Creating a group...');
    const createGroupResponse = await axios.post(`${BASE_URL}/groups`, {
      name: 'Debug Group',
      description: 'Group for debugging',
      currency: 'EUR'
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const groupId = createGroupResponse.data.data.id;
    console.log(`✅ Group created. Group ID: ${groupId}`);

    // Step 3: Check if user is member of the group
    console.log('\n3. Checking group membership...');
    const getGroupResponse = await axios.get(`${BASE_URL}/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log(`✅ User is member of group. Member count: ${getGroupResponse.data.data._count.members}`);

    // Step 4: Try to create expense with minimal data
    console.log('\n4. Creating expense with minimal data...');
    const expenseData = {
      title: 'Test Expense',
      amount: 50.00,
      splitType: 'EQUAL',
      splits: [
        {
          userId: userId,
          amount: 50.00
        }
      ],
      payers: [
        {
          userId: userId,
          amount: 50.00
        }
      ]
    };

    try {
      const createExpenseResponse = await axios.post(`${BASE_URL}/groups/${groupId}/expenses`, expenseData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log('✅ Expense created successfully!');
      console.log('Response:', JSON.stringify(createExpenseResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Expense creation failed');
      console.log('Error status:', error.response?.status);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

debugExpenseCreation(); 