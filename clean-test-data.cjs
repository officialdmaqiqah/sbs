const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
  await client.connect();
  const tables = ['suppliers', 'customers', 'projects', 'items', 'sales_orders', 'purchase_orders', 'delivery_orders'];
  for (const table of tables) {
    let q = 'name';
    if (table === 'suppliers') q = 'supplier_name';
    if (table === 'customers') q = 'customer_name';
    if (table === 'items') q = 'item_name';
    if (table === 'sales_orders') q = 'so_number';
    if (table === 'purchase_orders') q = 'po_number';
    if (table === 'delivery_orders') q = 'do_number';
    try {
      const res = await client.query(`SELECT id FROM ${table} WHERE ${q} ILIKE '%test%' OR ${q} ILIKE '%178145%'`);
      console.log(`Found ${res.rowCount} test entries in ${table}`);
      if (res.rowCount > 0) {
        await client.query(`DELETE FROM ${table} WHERE ${q} ILIKE '%test%' OR ${q} ILIKE '%178145%'`);
        console.log(`Deleted ${res.rowCount} test entries from ${table}`);
      }
    } catch (e) { console.log(e.message); }
  }
  await client.end();
}
run();
