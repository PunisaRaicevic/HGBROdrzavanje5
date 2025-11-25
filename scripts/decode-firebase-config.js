#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Checking for Firebase config in environment...');

if (process.env.GOOGLE_SERVICES_JSON_BASE64) {
  console.log('✅ Found GOOGLE_SERVICES_JSON_BASE64 environment variable');
  
  try {
    const content = Buffer.from(
      process.env.GOOGLE_SERVICES_JSON_BASE64,
      'base64'
    ).toString('utf8');
    
    const targetPath = path.join(__dirname, '..', 'android', 'app', 'google-services.json');
    fs.writeFileSync(targetPath, content);
    
    console.log(`✅ Created: ${targetPath}`);
    console.log('🎉 Firebase config ready for build!');
  } catch (error) {
    console.error('❌ Failed to decode Firebase config:', error.message);
    process.exit(1);
  }
} else {
  console.log('⚠️  GOOGLE_SERVICES_JSON_BASE64 not found in environment');
  
  const localPath = path.join(__dirname, '..', 'android', 'app', 'google-services.json');
  if (fs.existsSync(localPath)) {
    console.log('✅ Using local google-services.json (development mode)');
  } else {
    console.error('❌ No Firebase config found! Set GOOGLE_SERVICES_JSON_BASE64 environment variable for AppFlow builds.');
    process.exit(1);
  }
}
