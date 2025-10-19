const fs = require('fs');
const path = require('path');

class OAuthTokenManager {
    constructor() {
        this.tokenFile = './oauth-tokens.json';
    }

    saveTokens(tokens) {
        try {
            const tokenData = {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                scope: tokens.scope,
                token_type: tokens.token_type,
                expiry_date: tokens.expiry_date,
                saved_at: new Date().toISOString()
            };
            
            fs.writeFileSync(this.tokenFile, JSON.stringify(tokenData, null, 2));
            console.log('✅ OAuth tokens saved successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to save tokens:', error.message);
            return false;
        }
    }

    loadTokens() {
        try {
            if (fs.existsSync(this.tokenFile)) {
                const tokenData = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
                console.log('✅ OAuth tokens loaded successfully');
                return tokenData;
            } else {
                console.log('⚠️ No saved tokens found');
                return null;
            }
        } catch (error) {
            console.error('❌ Failed to load tokens:', error.message);
            return null;
        }
    }

    hasValidTokens() {
        const tokens = this.loadTokens();
        if (!tokens) return false;
        
        // Check if tokens are expired
        if (tokens.expiry_date && new Date() > new Date(tokens.expiry_date)) {
            console.log('⚠️ Tokens are expired');
            return false;
        }
        
        return true;
    }

    clearTokens() {
        try {
            if (fs.existsSync(this.tokenFile)) {
                fs.unlinkSync(this.tokenFile);
                console.log('✅ Tokens cleared');
            }
        } catch (error) {
            console.error('❌ Failed to clear tokens:', error.message);
        }
    }
}

module.exports = OAuthTokenManager;