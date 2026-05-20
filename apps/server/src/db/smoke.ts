import { randomUUID } from 'node:crypto';
import { pool } from './pool.js';
import { createUser } from './repositories/users.repo.js';
import { insertResults } from './repositories/results.repo.js';

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const suffix = Date.now();
    const users = [];
    for (let i = 0; i < 5; i++) {
      users.push(await createUser(client, `smoke_${suffix}_${i}`, 'fake-hash'));
    }
    console.log('✓ created 5 users');

    const roomId = randomUUID();
    const results = await insertResults(
      client,
      roomId,
      users.map((u, i) => ({ userId: u.id, finalChampionId: `champ_${i}` })),
    );
    if (results.length !== 5) throw new Error(`expected 5 results, got ${results.length}`);
    console.log('✓ inserted 5 draft_results');

    await client.query('ROLLBACK');
    console.log('✓ rolled back — DB left clean');

    console.log('\n✅ smoke test passed');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error('\n❌ smoke test failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
