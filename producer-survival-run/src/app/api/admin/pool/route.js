import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { title, stem_url } = await request.json();

    if (!title || !stem_url) {
      return NextResponse.json({ error: 'Missing title or stem_url parameter.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase Service Role Key or URL. Cannot bypass RLS securely.');
      return NextResponse.json({ error: 'Server misconfiguration: Missing Supabase Service Role Key.' }, { status: 500 });
    }

    // Initialize Supabase client with the Service Role Key to bypass Row-Level Security (RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabaseAdmin
      .from('daily_drop_pool')
      .insert({
        title,
        stem_url,
        is_used: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error in /api/admin/pool:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
