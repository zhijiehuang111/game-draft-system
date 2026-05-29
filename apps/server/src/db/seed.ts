import { pool } from "./pool.js";
import { hashPassword } from "../auth/password.js";
import { createUser, findByUsername } from "./repositories/users.repo.js";

const PASSWORD = "password";
const USERNAMES = ["player1", "player2", "player3", "player4"];

async function main() {
  const passwordHash = await hashPassword(PASSWORD);

  for (const username of USERNAMES) {
    const existing = await findByUsername(pool, username);
    if (existing) {
      console.log(`- ${username} already exists, skipped`);
      continue;
    }
    await createUser(pool, username, passwordHash);
    console.log(`✓ created ${username}`);
  }

  console.log(
    `\n✅ seed done — login with any of [${USERNAMES.join(", ")}] / "${PASSWORD}"`,
  );
}

main()
  .catch((err) => {
    console.error("\n❌ seed failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
