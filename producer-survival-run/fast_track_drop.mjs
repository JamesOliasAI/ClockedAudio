import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Fast-tracking drop for date: ${today}`);

  // 1. Delete existing drop for today if any
  const { error: delError } = await supabase
    .from('daily_drops')
    .delete()
    .eq('release_date', today);

  if (delError) {
    console.error("Error deleting today's existing drop:", delError);
  } else {
    console.log("Cleared existing drop for today (if any).");
  }

  // 2. Fetch the most recently uploaded sound from the pool
  const { data: poolData, error: poolError } = await supabase
    .from('daily_drop_pool')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (poolError || !poolData || poolData.length === 0) {
    console.error("Error fetching from pool or pool is empty.", poolError);
    process.exit(1);
  }

  const newSound = poolData[0];
  console.log(`Found newest sound in pool: "${newSound.title}"`);

  // 3. Insert into daily_drops
  const { error: insertError } = await supabase
    .from('daily_drops')
    .insert({
      title: newSound.title,
      stem_url: newSound.stem_url,
      release_date: today
    });

  if (insertError) {
    console.error("Error inserting into daily_drops:", insertError);
    process.exit(1);
  }
  
  console.log(`Successfully activated "${newSound.title}" as today's Daily Drop!`);

  // 4. Mark as used
  await supabase
    .from('daily_drop_pool')
    .update({ is_used: true })
    .eq('id', newSound.id);
}

main();
