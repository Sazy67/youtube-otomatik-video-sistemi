// Get OAuth URL for manual testing
const axios = require('axios');

async function getOAuthURL() {
  try {
    const response = await axios.get('http://localhost:3001/auth/youtube?email=suatayaz@gmail.com');
    
    if (response.data.success) {
      console.log('🔗 OAUTH URL FOR suatayaz@gmail.com:');
      console.log('');
      console.log(response.data.data.authUrl);
      console.log('');
      console.log('📋 Steps:');
      console.log('1. Copy the URL above');
      console.log('2. Open in browser');
      console.log('3. Login with suatayaz@gmail.com');
      console.log('4. Grant YouTube permissions');
      console.log('5. You will be redirected to: http://localhost:3001/auth/youtube/callback');
      console.log('');
      console.log('🎬 After OAuth: Create "Papatya Bakımı" video!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getOAuthURL();