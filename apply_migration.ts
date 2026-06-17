import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/20260613164500_phase3a_purchase_receipt.sql'), 'utf-8');
        await client.query(sql);
        console.log('Migration applied successfully');

    } catch (e) {
        console.error('Error applying migration:', e);
    } finally {
        await client.end();
    }
}

main();
