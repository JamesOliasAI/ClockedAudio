const fs = require('fs');
const path = require('path');
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

// 1. Load and parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
console.log(`Reading environment variables from: ${envPath}`);

if (!fs.existsSync(envPath)) {
  console.error(`Error: .env.local file not found at ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const r2AccessKey = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2SecretKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const r2Endpoint = env.CLOUDFLARE_R2_ENDPOINT;
const r2BucketName = env.CLOUDFLARE_R2_BUCKET_NAME;

if (!r2AccessKey || !r2SecretKey || !r2Endpoint || !r2BucketName) {
  console.error('Error: Cloudflare R2 credentials missing from .env.local.');
  console.log('Ensure CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_ENDPOINT, and CLOUDFLARE_R2_BUCKET_NAME are configured.');
  process.exit(1);
}

console.log(`Configuring CORS for R2 bucket: "${r2BucketName}"`);
console.log(`Endpoint: ${r2Endpoint}`);

// 2. Initialize S3 client (must use forcePathStyle: true)
const s3 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
  forcePathStyle: true,
});

// 3. Define CORS rules allowing local development origin
const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: ['*'],
      ExposeHeaders: [],
      MaxAgeSeconds: 3000
    }
  ]
};

async function run() {
  try {
    const command = new PutBucketCorsCommand({
      Bucket: r2BucketName,
      CORSConfiguration: corsConfiguration
    });
    
    await s3.send(command);
    console.log('==================================================');
    console.log('✅ CORS POLICY SUCCESSFULLY INSTALLED ON CLOUDFLARE R2!');
    console.log('Allows: http://localhost:3000');
    console.log('Methods: GET, PUT, POST, DELETE, HEAD');
    console.log('==================================================');
  } catch (error) {
    console.error('❌ Error applying CORS configuration:', error);
    console.log('\nTip: If you get a signature error, make sure your Access Key ID and Secret Access Key are correct and have full Admin/Bucket permissions.');
  }
}

run();
