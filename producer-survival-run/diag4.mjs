import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log('Testing Supabase Auth signUp...');
  const { data, error } = await supabase.auth.signUp({
    email: 'test_discord_oauth@example.com',
    password: 'pass-discord-123456-2026',
    options: {
      data: {
        username: 'test_oauth'
      }
    }
  });
  
  if (error) {
    console.error('SignUp Error:', error.message);
  } else {
    console.log('SignUp Success!');
    console.log('User created:', !!data.user);
    console.log('Session created:', !!data.session);
    if (!data.session) {
      console.log('WARNING: Session is null! Email confirmation is likely enabled.');
    }
  }
}
run();
