import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log('Testing Supabase Auth signInWithPassword...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'santiiik7@gmail.com_discord@clockedaudio.io', // Assuming they don't have this, wait, I don't know their email.
    password: 'pass-discord-123456-2026',
  });
  
  if (error) {
    console.error('SignIn Error:', error.message);
  } else {
    console.log('SignIn Success!');
  }
}
run();
