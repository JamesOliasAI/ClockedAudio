import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log('Testing users table upsert anonymously...');
  const { error } = await supabase.from('users').upsert({
    id: 'test-uuid-0000-0000-0000-000000000000',
    username: 'test_anon',
    email: 'test@example.com'
  });
  console.log('Upsert Error:', error ? error.message : 'None (Success)');
}
run();
