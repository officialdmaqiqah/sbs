const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const sql = fs.readFileSync('./supabase/migrations/20260617000000_p0_simplification.sql', 'utf8');
    await client.query(sql);
    console.log('Migration executed successfully');

    // Reload PostgREST schema cache
    await client.query('NOTIFY pgrst, \'reload schema\'');
    console.log('Schema cache reloaded');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
