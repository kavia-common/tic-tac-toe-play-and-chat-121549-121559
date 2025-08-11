# Tic Tac Toe Database (MongoDB)

This folder contains the MongoDB setup for persistent storage of users, games, and scores for the Tic Tac Toe app.

What you get:
- Startup script to run MongoDB locally and create admin/app users
- Initialization script to create collections with JSON Schema validation and indexes
- Optional seed script with example users, a game, and scores
- A simple database viewer (Node/Express) that can browse MongoDB using env vars

## Quick start

1) Start MongoDB and initialize collections

- Default values: DB_NAME=myapp, DB_PORT=5000, DB_USER=appuser, DB_PASSWORD=dbuser123
- You can override via environment variables before running

```
cd tic_tac_toe_database
# Optional: export DB_NAME="tic_tac_toe" DB_PORT=5000 DB_USER="adminuser" DB_PASSWORD="changeme" DB_SEED=1
bash startup.sh
```

This will:
- Start mongod on 127.0.0.1:5000
- Create an admin user in the "admin" database and an app user in your target DB
- Create collections (users, games, scores) with validators and indexes
- Optionally seed example data if you set DB_SEED=1

2) Connection information

- A handy command is saved to: `db_connection.txt`
- The Node viewer will use envs from: `db_visualizer/mongodb.env`

Expected env vars for other containers:
- MONGODB_URL (e.g., mongodb://appuser:dbuser123@localhost:5000/?authSource=admin)
- MONGODB_DB (e.g., myapp)

You can copy these into your `.env` for the backend.

## Collections and schema overview

The initialization script (`init/initialize_collections.js`) defines validators and indexes.

### users
Represents a player (optional authentication).

Fields:
- _id: ObjectId
- username: string, required, unique
- email: string, optional, unique (sparse)
- password_hash: string, optional (only if auth is implemented)
- created_at: date
- display_name: string, optional
- avatar_url: string, optional

Indexes:
- ux_users_username: { username: 1 }, unique
- ux_users_email: { email: 1 }, unique, sparse

### games
Stores a single game and its moves.

Fields:
- _id: ObjectId
- started_at: date, required
- ended_at: date, optional
- playerX: string, optional (username/guest id)
- playerO: string, optional (username/guest id)
- playerX_id: ObjectId, optional (reference to users._id)
- playerO_id: ObjectId, optional (reference to users._id)
- winner: "X" | "O" | "draw" | null
- moves: array of { cell: int 0..8, player: "X" | "O", at: date }

Indexes:
- ix_games_ended_at_desc: { ended_at: -1 }
- ix_games_winner_ended: { winner: 1, ended_at: -1 }
- ix_games_players: { playerX: 1, playerO: 1 }

### scores
Aggregated scoreboard per user.

Fields:
- _id: ObjectId
- user: string, required, unique (username or guest id)
- user_id: ObjectId, optional (reference to users._id)
- wins: int >= 0
- losses: int >= 0
- draws: int >= 0
- last_updated: date

Indexes:
- ux_scores_user: { user: 1 }, unique
- ix_scores_leaderboard: { wins: -1, draws: -1 }

## Seeding example data

To seed the database with example users, a game, and example scores:

Option A: Set an environment variable and run startup
```
export DB_SEED=1
bash startup.sh
```

Option B: Run the seed script manually
```
# Make sure MongoDB is running
mongosh "mongodb://appuser:dbuser123@localhost:5000/myapp?authSource=admin" init/seed_example_data.js
```

## Using from the backend

The backend should connect using environment variables provided by the deployment (do not hard-code):
- MONGODB_URL (connection string with authSource=admin)
- MONGODB_DB (target DB name)

Example pseudo-config:
- MONGODB_URL=mongodb://appuser:dbuser123@localhost:5000/?authSource=admin
- MONGODB_DB=myapp

## Notes

- The scripts are idempotent: running them again will not duplicate collections or indexes.
- If you change the schema constraints, rerun `init/initialize_collections.js` to apply updates via `collMod`.
- For production, you would typically start mongod with authentication/authorization enabled and secure credentials managed externally.
