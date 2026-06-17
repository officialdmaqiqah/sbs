import { supabase } from './src/lib/supabase';
async function run() {
  const {data: p} = await supabase.from('projects').select('*').limit(1);
  console.log('Projects:', p);
  const {data: pr} = await supabase.from('products').select('*').limit(1);
  console.log('Products:', pr);
  const {data: o} = await supabase.from('organizations').select('*').limit(1);
  console.log('Orgs:', o);
}
run();
