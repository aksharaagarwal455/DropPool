# DropPool database schema

MongoDB Atlas is the database. The API reads `MONGO_URI`. `MONGO_DB_NAME` overrides the database name in that URI when it is set.

If `MONGO_URI` is empty, the process still starts. Health reports `database.status: unconfigured`. No collections are created in that state.

## User

Collection: `users` (Mongoose model `User`).

| Field | Rule |
| --- | --- |
| `name` | Required string, trimmed, max 80 characters |
| `email` | Required, unique, trimmed, lowercased |
| `passwordHash` | Required. Excluded from queries unless explicitly selected |
| `hostel` | Required string |
| `block` | Required string |
| `floor` | Required string |
| `profileImage` | String or `null` |
| `upiId` | String or `null`. Excluded from queries unless explicitly selected |
| `role` | `student` or `admin`. Default `student` |
| `emailVerified` | Boolean. Default `false` |
| `trust.completedPools` | Number. Default `0` |
| `trust.cancelledPools` | Number. Default `0` |
| `isDemo` | Boolean. Default `false`. Later resets must delete only `isDemo: true` records |
| `createdAt`, `updatedAt` | Set by Mongoose timestamps |

Indexes:

- Unique index on `email`
- `{ hostel: 1, block: 1 }`
- `{ isDemo: 1 }`

Passwords are stored only as a bcrypt hash with 12 rounds. The schema does not store a raw email-verification token. Verification, when it is added, must not put a raw token in this document.

There is no `campusId` field in this foundation. Campus filtering is not implemented.

## Not created yet

Shopping intents, cart extractions, fee profiles, match proposals, pools, pool members, payments, orders, demand snapshots, and notifications have no Mongoose models in this build.
