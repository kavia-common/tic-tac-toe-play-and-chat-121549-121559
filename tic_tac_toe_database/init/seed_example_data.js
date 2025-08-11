//
// Optional seed script for local verification
// Usage:
//    mongosh "mongodb://<user>:<password>@localhost:<port>/<db>?authSource=admin" init/seed_example_data.js
//
// This script is safe to re-run; it upserts by keys.
//

function upsertScore(user, wins, losses, draws) {
  db.scores.updateOne(
    { user },
    {
      $setOnInsert: { user, created_at: new Date() },
      $set: {
        wins: wins,
        losses: losses,
        draws: draws,
        last_updated: new Date()
      }
    },
    { upsert: true }
  );
}

function ensureUser(username, email) {
  const existing = db.users.findOne({ username });
  if (!existing) {
    const _id = db.users.insertOne({
      username,
      email: email || null,
      created_at: new Date(),
      display_name: username.charAt(0).toUpperCase() + username.slice(1)
    }).insertedId;
    print(`✓ Inserted user: ${username} (${_id})`);
    return _id;
  } else {
    print(`• User exists: ${username} (${existing._id})`);
    return existing._id;
  }
}

print(`Seeding example data in DB: ${db.getName()}`);

// Example users
const aliceId = ensureUser("alice", "alice@example.com");
const bobId = ensureUser("bob", "bob@example.com");

// Example game
const anyGame = db.games.findOne({});
if (!anyGame) {
  const started = new Date();
  const ended = new Date(started.getTime() + 60 * 1000);
  db.games.insertOne({
    started_at: started,
    ended_at: ended,
    playerX: "alice",
    playerO: "bob",
    playerX_id: aliceId,
    playerO_id: bobId,
    winner: "X",
    moves: [
      { cell: 0, player: "X", at: new Date(started.getTime() + 1 * 1000) },
      { cell: 4, player: "O", at: new Date(started.getTime() + 5 * 1000) },
      { cell: 1, player: "X", at: new Date(started.getTime() + 9 * 1000) },
      { cell: 5, player: "O", at: new Date(started.getTime() + 13 * 1000) },
      { cell: 2, player: "X", at: new Date(started.getTime() + 17 * 1000) } // Alice wins on top row
    ]
  });
  print("✓ Inserted example game (alice vs bob)");
} else {
  print("• At least one game already exists; skipping game seed");
}

// Example scores
upsertScore("alice", 3, 1, 0);
upsertScore("bob", 1, 2, 1);
upsertScore("guest", 0, 0, 1);

print("✓ Seed data ready.")
