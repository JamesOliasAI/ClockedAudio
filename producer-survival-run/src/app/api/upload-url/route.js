import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { filename, contentType, userId, dailyDropId } = await request.json();

    // 1. Strict MP3 check as per mainplan.md
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType parameter.' }, { status: 400 });
    }

    // 2. Strict Timer Check
    if (userId && dailyDropId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey && supabaseUrl !== 'mock-live-url') {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: attempt, error } = await supabase
          .from('daily_drop_attempts')
          .select('created_at')
          .eq('user_id', userId)
          .eq('daily_drop_id', dailyDropId)
          .single();

        if (error || !attempt) {
          return NextResponse.json({ error: 'No active battle session found for this user.' }, { status: 403 });
        }

        const attemptTime = new Date(attempt.created_at).getTime();
        const diffMs = Date.now() - attemptTime;
        // 20 minutes + 1 minute grace period for upload request transit
        const MAX_TIME_MS = 21 * 60 * 1000;
        
        if (diffMs > MAX_TIME_MS) {
          return NextResponse.json({ error: 'Time limit exceeded. The 20-minute window has officially closed.' }, { status: 403 });
        }
      }
    }

    const isMp3 = contentType === 'audio/mpeg' || contentType === 'audio/mp3' || filename.toLowerCase().endsWith('.mp3');

    if (!isMp3) {
      return NextResponse.json({
        error: 'Invalid format! WAV is strictly disabled. Uploads are restricted strictly to MP3 ONLY to optimize R2 storage and maintain low countdown egress.'
      }, { status: 400 });
    }

    // 2. Check if Cloudflare R2 environment variables are configured
    const r2AccessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const r2SecretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
    const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    const isR2Configured = !!(r2AccessKey && r2SecretKey && r2Endpoint && r2BucketName);

    const fileKey = `submissions/${Date.now()}-${Math.random().toString(36).substring(2, 10)}-${filename}`;

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
      
      // Determine public URL (either from a custom public URL/subdomain or fallback to endpoint/bucket)
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
      // Return a simulated upload URL and mock data so the app functions fully
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
    console.error('Error generating upload URL:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
