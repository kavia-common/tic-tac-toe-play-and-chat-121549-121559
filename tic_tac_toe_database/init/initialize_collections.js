//
// MongoDB initialization script for Tic Tac Toe collections
// Usage:
//   mongosh "mongodb://<user>:<password>@localhost:<port>/<db>?authSource=admin" init/initialize_collections.js
//
// This script is idempotent: it safely creates collections with JSON schema
// validation and indexes if they do not exist, and updates validators if they do.
//

function ensureCollection(name, validator, validationLevel = 'moderate', validationAction = 'warn') {
  const existing = db.getCollectionNames();
  if (existing.indexOf(name) === -1) {
    db.createCollection(name, { validator: validator, validationLevel, validationAction });
    print(`✓ Created collection: ${name}`);
  } else {
    // Update validator to latest definition
    const res = db.runCommand({
      collMod: name,
      validator: validator,
      validationLevel,
      validationAction
    });
    if (res.ok) {
      print(`✓ Updated validator for collection: ${name}`);
    } else {
      print(`! Failed to update validator for ${name}: ${tojson(res)}`);
    }
  }
}

function ensureIndex(coll, spec, options) {
  const name = options && options.name ? options.name : Object.keys(spec).map(k => `${k}_${spec[k]}`).join('_');
  const indexes = db.getCollection(coll).getIndexes().map(i => i.name);
  if (indexes.indexOf(name) === -1) {
    db.getCollection(coll).createIndex(spec, Object.assign({ name }, options || {}));
    print(`✓ Created index on ${coll}: ${name}`);
  } else {
    print(`• Index exists on ${coll}: ${name}`);
  }
}

// Users collection
const usersValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["username"],
    additionalProperties: true,
    properties: {
      _id: { bsonType: ["objectId"] },
      username: {
        bsonType: "string",
        description: "Unique username used to identify a player",
        minLength: 3,
        maxLength: 64
      },
      email: {
        bsonType: ["string", "null"],
        description: "Optional email for the user",
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
      },
      password_hash: {
        bsonType: ["string", "null"],
        description: "Optional password hash if authentication is enabled"
      },
      created_at: { bsonType: ["date"], description: "Creation timestamp" },
      display_name: { bsonType: ["string", "null"], description: "Optional name for UI" },
      avatar_url: { bsonType: ["string", "null"], description: "Optional avatar image URL" }
    }
  }
};

// Games collection
const gamesValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["started_at"],
    additionalProperties: true,
    properties: {
      _id: { bsonType: ["objectId"] },
      started_at: { bsonType: "date", description: "Game start time" },
      ended_at: { bsonType: ["date", "null"], description: "Game end time" },
      playerX: { bsonType: ["string", "null"], description: "Username or guest identifier for X" },
      playerO: { bsonType: ["string", "null"], description: "Username or guest identifier for O" },
      playerX_id: { bsonType: ["objectId", "null"], description: "User _id for X (optional)" },
      playerO_id: { bsonType: ["objectId", "null"], description: "User _id for O (optional)" },
      winner: { bsonType: ["string", "null"], enum: ["X", "O", "draw", null], description: "Winner of the game" },
      moves: {
        bsonType: ["array"],
        description: "List of moves in the game",
        items: {
          bsonType: "object",
          required: ["cell", "player", "at"],
          properties: {
            cell: { bsonType: "int", minimum: 0, maximum: 8, description: "Board cell index 0..8" },
            player: { bsonType: "string", enum: ["X", "O"], description: "Player making the move" },
            at: { bsonType: "date", description: "Timestamp of the move" }
          },
          additionalProperties: false
        }
      }
    }
  }
};

// Scores collection (aggregated scoreboard)
const scoresValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["user", "wins", "losses", "draws", "last_updated"],
    additionalProperties: true,
    properties: {
      _id: { bsonType: ["objectId"] },
      user: { bsonType: "string", description: "Username or guest identifier, unique" },
      user_id: { bsonType: ["objectId", "null"], description: "Reference to users._id (optional)" },
      wins: { bsonType: "int", minimum: 0, description: "Total wins" },
      losses: { bsonType: "int", minimum: 0, description: "Total losses" },
      draws: { bsonType: "int", minimum: 0, description: "Total draws" },
      last_updated: { bsonType: "date", description: "Last updated timestamp" }
    }
  }
};

print(`Initializing collections in DB: ${db.getName()}`);

// Ensure collections with validators
ensureCollection("users", usersValidator, "moderate", "warn");
ensureCollection("games", gamesValidator, "moderate", "warn");
ensureCollection("scores", scoresValidator, "moderate", "warn");

// Ensure indexes
ensureIndex("users", { username: 1 }, { unique: true, name: "ux_users_username" });
ensureIndex("users", { email: 1 }, { unique: true, sparse: true, name: "ux_users_email" });

ensureIndex("games", { ended_at: -1 }, { name: "ix_games_ended_at_desc" });
ensureIndex("games", { winner: 1, ended_at: -1 }, { name: "ix_games_winner_ended" });
ensureIndex("games", { playerX: 1, playerO: 1 }, { name: "ix_games_players" });

ensureIndex("scores", { user: 1 }, { unique: true, name: "ux_scores_user" });
ensureIndex("scores", { wins: -1, draws: -1 }, { name: "ix_scores_leaderboard" });

print("✓ Collections and indexes are ready.")
