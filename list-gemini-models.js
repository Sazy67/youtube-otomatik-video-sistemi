const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listGeminiModels() {
    console.log('🔍 Listing available Gemini models...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : '❌ Missing');
    
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
        console.log('❌ Gemini API key not configured');
        return;
    }
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Try to list models using the REST API directly
        const axios = require('axios');
        
        console.log('📡 Fetching model list from Gemini API...');
        
        const response = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
            params: {
                key: apiKey
            }
        });
        
        if (response.data && response.data.models) {
            console.log('✅ Available models:');
            response.data.models.forEach((model, index) => {
                console.log(`   ${index + 1}. ${model.name}`);
                if (model.displayName) {
                    console.log(`      Display: ${model.displayName}`);
                }
                if (model.description) {
                    console.log(`      Description: ${model.description.substring(0, 100)}...`);
                }
                console.log('');
            });
            
            // Find the best model for text generation
            const textModels = response.data.models.filter(model => 
                model.name.includes('gemini') && 
                model.supportedGenerationMethods && 
                model.supportedGenerationMethods.includes('generateContent')
            );
            
            if (textModels.length > 0) {
                console.log('🎯 Recommended models for text generation:');
                textModels.forEach((model, index) => {
                    console.log(`   ${index + 1}. ${model.name.replace('models/', '')}`);
                });
            }
            
        } else {
            console.log('⚠️ No models found in response');
        }
        
    } catch (error) {
        console.error('❌ Failed to list models:', error.message);
        
        if (error.response) {
            console.error('📊 Status:', error.response.status);
            console.error('📝 Response:', error.response.data);
        }
        
        if (error.message.includes('API_KEY_INVALID')) {
            console.error('🔑 Invalid API key');
            console.error('💡 Solutions:');
            console.error('   1. Check your API key in .env file');
            console.error('   2. Verify API key is enabled for Gemini API');
            console.error('   3. Check API key permissions in Google AI Studio');
        }
    }
}

listGeminiModels();