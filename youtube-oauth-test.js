// YouTube OAuth Test Script
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function startYouTubeAuth() {
  console.log('🔐 YouTube OAuth Authentication Starting...\n');

  try {
    // 1. Get OAuth URL
    console.log('1️⃣ Getting YouTube OAuth URL...');
    const email = 'your-email@gmail.com'; // Gerçek email'inizi buraya yazın
    
    const authResponse = await axios.get(`${BASE_URL}/auth/youtube`, {
      params: { email: email }
    });

    console.log('✅ OAuth URL Generated');
    console.log('📧 Email:', email);
    
    if (authResponse.data && authResponse.data.data && authResponse.data.data.authUrl) {
      const authUrl = authResponse.data.data.authUrl;
      console.log('🔗 OAuth URL:', authUrl);
      console.log('');
      
      // 2. Open browser for authentication
      console.log('2️⃣ Opening browser for YouTube authentication...');
      console.log('🌐 Browser will open automatically');
      console.log('📋 Please complete the OAuth flow in your browser');
      console.log('');
      
      // Show the OAuth URL for manual opening
      console.log('🔗 Please open this URL in your browser:');
      console.log(authUrl);
      
      console.log('✅ OAuth URL ready for manual opening!');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('   1. Complete YouTube OAuth in the opened browser');
      console.log('   2. Grant permissions to your YouTube channel');
      console.log('   3. You will be redirected back to the system');
      console.log('   4. Then you can create your "Papatya Bakımı" video!');
      console.log('');
      console.log('🎬 After OAuth completion, your system will be ready to:');
      console.log('   ✅ Generate AI script about papatya bakımı');
      console.log('   ✅ Create professional Turkish narration');
      console.log('   ✅ Find beautiful daisy images');
      console.log('   ✅ Edit and upload to your YouTube channel');
      
    } else {
      console.log('❌ No auth URL received. Response:', authResponse.data);
    }

  } catch (error) {
    console.error('❌ OAuth test failed:', error.message);
    
    if (error.response) {
      console.error('📋 Response details:', error.response.data);
      
      if (error.response.status === 500) {
        console.log('');
        console.log('🔧 Possible solutions:');
        console.log('   1. Check if YouTube API keys are set in .env file');
        console.log('   2. Verify Google Cloud Console setup');
        console.log('   3. Ensure YouTube Data API v3 is enabled');
        console.log('   4. Check OAuth redirect URI configuration');
      }
    }
  }
}

// Run the OAuth test
startYouTubeAuth();