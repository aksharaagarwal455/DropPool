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

## ShoppingIntent

Collection: `shoppingintents` (Mongoose model `ShoppingIntent`).

| Field | Rule |
| --- | --- |
| `userId` | ObjectId ref to `User`, required |
| `platform` | Enum: `blinkit`, `zepto`, `instamart`, required |
| `items` | Array of `{ name, qty, unitPricePaise }` |
| `subtotalPaise` | Number (integer paise) or `null` if prices missing |
| `windowStart`, `windowEnd` | Date timestamps (validated $\le 24$ hours window) |
| `hostel`, `block`, `floor` | Campus location strings |
| `status` | Enum: `active`, `reserved`, `pooled`, `cancelled`, `expired` |
| `ready` | Boolean (true when items $\ge 1$ and all items have valid prices) |
| `observedFeesPaise` | Number (integer paise) or `null` (from screenshot) |
| `source` | Enum: `manual`, `screenshot` |
| `isDemo` | Boolean |

## Pool

Collection: `pools` (Mongoose model `Pool`).

| Field | Rule |
| --- | --- |
| `hostUserId` | ObjectId ref to `User`, required |
| `platform` | Enum: `blinkit`, `zepto`, `instamart`, required |
| `status` | Enum: `proposed`, `confirmed`, `awaiting_payments`, `payments_confirmed`, `order_placed`, `ready_for_pickup`, `completed`, `cancelled` |
| `members` | Array of member subdocuments (userId, intentId, items, individualTotalPaise, initialSharePaise, finalSharePaise, confirmed, isHost) |
| `targetReached` | Boolean (indicates free delivery threshold was reached) |
| `proximityTier` | Number (0..4 distance tier of the pool group) |
| `estimatedTotalPaise` | Number (integer paise, pooled checkout estimate) |
| `actualTotalPaise` | Number (integer paise, recorded by host at order placement) |
| `pickupLocation` | String (common pickup point entered by host) |
| `isDemo` | Boolean |

## Payment

Collection: `payments` (Mongoose model `Payment`).

| Field | Rule |
| --- | --- |
| `poolId` | ObjectId ref to `Pool`, required |
| `fromUserId` | ObjectId ref to `User` (paying peer), required |
| `toUserId` | ObjectId ref to `User` (host receiving share), required |
| `amountPaise` | Number (integer paise), required |
| `status` | Enum: `pending`, `claimed`, `confirmed`, `rejected`, `refunded` |
| `utr` | String (transaction reference claimed by student) |
| `rejectionReason` | String or `null` |
| `isDemo` | Boolean |

## FeeProfile

Collection: `feeprofiles` (Mongoose model `FeeProfile`).

Stores illustrative or admin-edited platform fee tiers (`deliveryFeePaise`, `smallCartFeePaise`, `smallCartThresholdPaise`, `freeDeliveryThresholdPaise`, `handlingFeePaise`, `version`, `isIllustrative`). Snapshotted into pool proposals at matching time.
