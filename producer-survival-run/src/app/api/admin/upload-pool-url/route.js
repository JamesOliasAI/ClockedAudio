import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(request) {
  try {
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType parameter.' }, { status: 400 });
    }

    // 2. Check if Cloudflare R2 environment variables are configured
    const r2AccessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const r2SecretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
    const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    const isR2Configured = !!(r2AccessKey && r2SecretKey && r2Endpoint && r2BucketName);

    // Use daily-drops prefix instead of submissions
    const fileKey = `daily-drops/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    if (isR2Configured) {
      // Configure S3 Client for Cloudflare R2
      const s3 = new S3Client({
        region: 'auto',
        endpoint: r2Endpoint,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2SecretKey,
        },
        forcePathStyle: true,
      });

      const command = new PutObjectCommand({
        Bucket: r2BucketName,
        Key: fileKey,
        ContentType: contentType,
      });

      // Generate presigned PUT URL valid for 10 minutes (600 seconds)
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
      
      const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
        ? `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileKey}`
        : `${r2Endpoint}/${r2BucketName}/${fileKey}`;

      return NextResponse.json({
        url: presignedUrl,
        publicUrl: publicUrl,
        mode: 'live',
        headers: {
          'Content-Type': contentType
        }
      });
    } else {
      // --- LOCAL FALLBACK SIMULATOR MODE ---
      const simulatedUrl = `http://localhost:3000/api/mock-upload?key=${encodeURIComponent(fileKey)}`;
      const simulatedPublicUrl = `/audio/simulated-uploads/${fileKey}`;

      return NextResponse.json({
        url: simulatedUrl,
        publicUrl: simulatedPublicUrl,
        mode: 'mock',
        headers: {
          'Content-Type': contentType
        }
      });
    }
  } catch (err) {
    console.error('Error generating admin upload URL:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
