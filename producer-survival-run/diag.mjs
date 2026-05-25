import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  console.log('Checking users table...');
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error querying users table:', error);
  } else {
    console.log(`Found ${data.length} users in public.users`);
    if (data.length > 0) console.log('Latest user:', data[data.length - 1]);
  }
}
run();
