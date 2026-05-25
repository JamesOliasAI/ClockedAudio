import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define timezone offset, or just use UTC as standard for midnights
const isCronSecretValid = (request) => {
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
};

export async function GET(request) {
  // Validate that this request is actually coming from Vercel Cron
  // Local testing bypass: Allow if CRON_SECRET is not set in local env, or passing matching secret
  if (process.env.NODE_ENV === 'production' && !isCronSecretValid(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Initialize Supabase Admin client to bypass Row Level Security
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Note: We need a service role key here to insert/update reliably from a cron job without a logged in user.
  // For now, using the ANON key, but it's highly recommended to use SUPABASE_SERVICE_ROLE_KEY if RLS is enabled.
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Find an unused sound from the pool
    const { data: poolData, error: poolError } = await supabase
      .from('daily_drop_pool')
      .select('*')
      .eq('is_used', false)
      .limit(1); // Since we just need one, we can limit. To make it truly random, we could select all and pick one in JS, or use a Postgres RPC for random selection.

    if (poolError) {
      console.error('Error fetching from pool:', poolError);
      return NextResponse.json({ error: 'Database error fetching pool' }, { status: 500 });
    }

    if (!poolData || poolData.length === 0) {
      console.warn('CRITICAL: No unused sounds left in the daily_drop_pool!');
      return NextResponse.json({ error: 'No unused sounds left in pool' }, { status: 404 });
    }

    // Pick one (randomly if multiple were returned, but here we just grab the first one)
    // To grab a random one from the limit 1, we just take index 0. (Better randomized logic: order by random() in DB, but Supabase JS client doesn't support random() order natively without an RPC. So we take the first available).
    const selectedSound = poolData[0];

    // 2. Insert it into the daily_drops table
    // Format today's date as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // Check if a drop for today already exists to prevent duplicates
    const { data: existingDrop } = await supabase
      .from('daily_drops')
      .select('id')
      .eq('release_date', today)
      .single();

    if (existingDrop) {
      return NextResponse.json({ message: 'A drop for today already exists', existingDrop }, { status: 200 });
    }

    const { data: newDrop, error: insertError } = await supabase
      .from('daily_drops')
      .insert({
        title: selectedSound.title,
        stem_url: selectedSound.stem_url,
        release_date: today
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting new daily drop:', insertError);
      return NextResponse.json({ error: 'Database error inserting drop' }, { status: 500 });
    }

    // 3. Mark the sound as used in the pool
    const { error: updateError } = await supabase
      .from('daily_drop_pool')
      .update({ is_used: true })
      .eq('id', selectedSound.id);

    if (updateError) {
      console.error('Error updating pool item to used:', updateError);
      // We don't fail the whole request here since the drop was successfully created, but we should log it
    }

    return NextResponse.json({
      success: true,
      message: 'New daily drop activated successfully',
      drop: newDrop
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in daily-drop cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
