# Plan 1: 1-to-1 Chatting & Secure File Sharing System

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-grade, secure, and low-cost 1-to-1 chatting and file-sharing system.

**Node.js Backend & Flutter Frontend Split:**

- **Backend (Node.js, Express, TypeScript)**:
  - Establishes Socket.io server with Redis Pub/Sub adapter to sync chat channels.
  - Handles database validation (Prisma/PostgreSQL) checking if users are connected (`UserConnection` is `ACCEPTED`) before creating channels.
  - Runs Trie-based profanity scanner inside message save pipelines.
  - Exposes secure file retrieval router (`GET /conversations/:id/attachments/:attachmentId`) checking conversation membership before serving attachments.
  - Enqueues BullMQ jobs to dispatch FCM pushes when sockets determine a recipient is offline.
- **Frontend (Flutter Mobile App)**:
  - Establishes persistent WebSocket connection using `socket_io_client` with JWT auth headers.
  - Listens to incoming push notification payloads (`firebase_messaging`) in the background/terminated states to trigger UI wakes.
  - Integrates file upload pipelines, fetching attachments via authenticated API requests.
  - Emits real-time typing status events (`typing:status`) and presence state indicators.

**Budget-Oriented & Free Tier Services:**

- **File Storage**: **Cloudflare R2** ($0 egress data-transfer fees, 10GB/month free storage tier) via the AWS S3 SDK compatibility interface (`@aws-sdk/client-s3`).
- **Push Notifications**: **Firebase Cloud Messaging (FCM)** (100% free with unlimited push payloads) via Node `firebase-admin` SDK.
- **Profanity Scanner**: Built-in Trie-based string matching service. Runs in Express server memory at **$0** monthly compute costs.

**Architecture:**

- **Whitelisted DM Conversations**: Conversations are limited to users who are connected (ACCEPTED state in `UserConnection` table) and not BLOCKED. A sorted unique compound key (`"userA.id_userB.id"`) prevents duplicate conversation records.
- **Real-Time Sockets**: Handled via Socket.io with a Redis adapter. Sockets listen for connection handshakes (verifying JWT), room join/leave events, messaging, and typing status.
- **Trie-based Content Moderation**: On-the-fly profanity scanner checks message body content in $O(N)$ linear time. If flagged, messages are stored with `isFlagged: true` for admin audit.
- **FCM Push Notification Pipeline (FCM + BullMQ)**: Enqueues background jobs in BullMQ when recipients are offline, dispatching FCM notifications to wake up mobile clients.
- **Secure File Sharing**: Integrates Cloudflare R2 with the S3 uploads module. Uploaded attachments are served via an Express router that verifies conversation membership before streaming files.

**Tech Stack:** Node.js, Express, TypeScript, Prisma (PostgreSQL), Redis (ioredis + socket.io-redis), BullMQ, Firebase Admin SDK.

Flutter Client Compatibility Rules:

- **WebSocket Handshake Auth**: The backend socket auth middleware must parse tokens from both `socket.handshake.auth.token` and `socket.handshake.query.token` since the Flutter `socket_io_client` package utilizes query-param connection strings on some mobile OS runtimes.
- **FCM Push Payload**: FCM notifications sent by the BullMQ worker must contain a `data` key payload with a flat JSON format (e.g. `{"click_action": "FLUTTER_NOTIFICATION_CLICK", "type": "CHAT", "conversationId": "id"}`) for compatibility with native background handlers.
- **Secure Attachment Headers**: Serve download streams with exact `Content-Type`, `Content-Length`, and `Content-Disposition` headers so that Flutter file downloaders (e.g. `dio`, `flutter_downloader`) can calculate download progress and write local cache files correctly.

---

## Detailed Component Plans

### Task 1: Database Migration & Schema Design (Chat & Connection)

Define database models for Conversations, Members, Messages, Message Attachments, Sensitive Words, and User Connections.

**Files:**

- Modify: `src/database/prisma/schema.prisma`
- Test: `tests/database/chat.schema.test.ts`

**Step 1: Write the failing test**
Create `tests/database/chat.schema.test.ts` to assert that user connections, messages, and conversation relations can be inserted into the database.

**Step 2: Run test to verify it fails**
Run: `npm test tests/database/chat.schema.test.ts`

**Step 3: Write minimal implementation**
Append `Conversation`, `ConversationMember`, `Message`, `MessageAttachment`, `SensitiveWord`, and `UserConnection` models to `src/database/prisma/schema.prisma`, along with relations on `User`.

Run migration:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name add_chat_schemas
```

**Step 4: Run test to verify it passes**
Run: `npm test tests/database/chat.schema.test.ts`

**Step 5: Commit**

```bash
git add src/database/prisma/schema.prisma tests/database/chat.schema.test.ts
git commit -m "db: add chat and connection schema models"
```

---

### Task 2: Trie-based Sensitive Word Filtering Service

Build a performant Trie structure to scan incoming chat messages for blacklisted words without blocking WebSocket threads.

**Files:**

- Create: `src/modules/chats/moderation.service.ts`
- Test: `tests/modules/chats/moderation.test.ts`

**Step 1: Write the failing test**
Create a test in `tests/modules/chats/moderation.test.ts` verifying that blacklisted words trigger flagged state returns.

**Step 2: Run test to verify it fails**
Run: `npm test tests/modules/chats/moderation.test.ts`

**Step 3: Write minimal implementation**
Create Trie nodes mapping child letters in `src/modules/chats/moderation.service.ts` to scan strings in $O(N)$ linear time.

**Step 4: Run test to verify it passes**
Run: `npm test tests/modules/chats/moderation.test.ts`

**Step 5: Commit**

```bash
git add src/modules/chats/moderation.service.ts tests/modules/chats/moderation.test.ts
git commit -m "feat: implement high-performance Trie-based sensitive word scanner"
```

---

### Task 3: Mobile FCM Background Alerts (BullMQ integration)

Register FCM tokens for Flutter clients, and send notifications in background BullMQ workers when users are offline.

**Files:**

- Modify: `src/jobs/worker.ts`
- Modify: `src/modules/users/user.service.ts`
- Modify: `src/modules/users/user.controller.ts`
- Modify: `src/modules/users/user.routes.ts`
- Modify: `src/modules/users/user.validator.ts`
- Test: `tests/modules/notifications/fcm.test.ts`

**Step 1: Write the failing test**
Create `tests/modules/notifications/fcm.test.ts` to register an FCM token and assert a BullMQ push alert is enqueued.

**Step 2: Run test to verify it fails**
Run: `npm test tests/modules/notifications/fcm.test.ts`

**Step 3: Write minimal implementation**
Mount `PUT /api/v1/users/me/fcm` in routes. Update `notificationWorker` in `src/jobs/worker.ts` to query recipient tokens and log FCM dispatch actions.

**Step 4: Run test to verify it passes**
Run: `npm test tests/modules/notifications/fcm.test.ts`

**Step 5: Commit**

```bash
git add src/modules/users/ src/jobs/ tests/modules/notifications/fcm.test.ts
git commit -m "feat: implement FCM token registration and async push queues via BullMQ"
```

---

### Task 4: Chat 1-to-1 Repositories & Services with Whitelisting

Implement database operations using Prisma for direct chats, retrieving messages, and managing records. Enforce sorted key conversation mapping and whitelist connection checks.

**Files:**

- Create: `src/modules/chats/chat.repository.ts`
- Create: `src/modules/chats/chat.service.ts`
- Test: `tests/modules/chats/chat.repository.test.ts`

**Step 1: Write the failing test**
Create a repository test verifying 1-to-1 conversation generation and connection whitelisting checks.

**Step 2: Run test to verify it fails**
Run: `npm test tests/modules/chats/chat.repository.test.ts`

**Step 3: Write minimal implementation**
Implement connection-check status verification, sorted keys formatting, and text profanity checks before saving messages in `src/modules/chats/`.

**Step 4: Run test to verify it passes**
Run: `npm test tests/modules/chats/chat.repository.test.ts`

**Step 5: Commit**

```bash
git add src/modules/chats/chat.repository.ts src/modules/chats/chat.service.ts tests/modules/chats/chat.repository.test.ts
git commit -m "feat: implement 1-to-1 ChatRepository with sorted unique conversation keys and whitelisting"
```

---

### Task 5: Chat Controllers, Sockets, & Secure Attachment Endpoints

Add validation and routing handlers for direct message endpoints, Socket.IO channels, and secure attachment delivery.

**Files:**

- Create: `src/modules/chats/chat.controller.ts`
- Create: `src/modules/chats/chat.validator.ts`
- Create: `src/modules/chats/chat.routes.ts`
- Create: `src/modules/chats/chat.socket.ts`
- Create: `src/modules/chats/attachment.controller.ts`
- Modify: `src/routes/index.ts`
- Modify: `src/server.ts`
- Test: `tests/modules/chats/chat.api.test.ts`

**Step 1: Write the failing test**
Create integration tests verifying chat REST endpoints, socket connection handshakes, and access-guarded attachment URLs.

**Step 2: Run test to verify it fails**
Run: `npm test tests/modules/chats/chat.api.test.ts`

**Step 3: Write minimal implementation**
Create REST/socket handlers in `src/modules/chats/` mapping `/api/v1/chats/conversations`. Add `/conversations/:id/attachments/:attachmentId` ensuring only conversation members can download attachments. Add custom endpoint configurations for Cloudflare R2 inside S3 upload pipelines.

**Step 4: Run test to verify it passes**
Run: `npm test tests/modules/chats/chat.api.test.ts`

**Step 5: Commit**

```bash
git add src/modules/chats/ src/routes/index.ts src/server.ts tests/modules/chats/chat.api.test.ts
git commit -m "feat: add 1-to-1 chat REST routes, socket listeners, and secure attachment delivery"
```
