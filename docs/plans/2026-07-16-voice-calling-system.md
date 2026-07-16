# Plan 2: 1-to-1 Voice (Audio) Calling System

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a low-cost, secure 1-to-1 voice calling system using WebRTC P2P audio streaming (no video track overhead) and Socket.io signaling.

**Architecture:**
- **P2P Audio Streaming**: Audio media streams directly between clients, resulting in **$0 server bandwidth costs**.
- **Signaling Channel**: Handles SDP offers, answers, and ICE candidate exchanges securely through Socket.io. Sockets verify that both caller and receiver are conversation members.
- **Dynamic TURN Access**: Generates time-limited credentials dynamically via a secure endpoint (`GET /api/v1/chats/calling/ice-servers`) using a shared secret hash (HMAC-SHA1) to bypass firewalls without exposing permanent API keys.
- **FCM Call alerts**: If the recipient is offline (checked via Redis presence), the socket server schedules a high-priority push notification job in **BullMQ** to wake up the Flutter client.
- **Call Logger**: Database log records (`type: AUDIO`) to track caller, receiver, call duration, connection date, and ended status.

**Tech Stack:** Node.js, Express, TypeScript, Prisma, Redis (ioredis), BullMQ, WebRTC (audio-only), Firebase Admin SDK.

---

## Detailed Component Plans

### Task 1: Database Migration & Schema Design (Voice Logs)

Define database models and relations for voice call logging.

**Files:**
- Modify: `src/database/prisma/schema.prisma`
- Test: `tests/database/calling.schema.test.ts`

**Step 1: Write the failing test**
Create `tests/database/calling.schema.test.ts` to assert that audio call logs can be created in database.

**Step 2: Run test to verify it fails**
Run: `npm test tests/database/calling.schema.test.ts`

**Step 3: Write minimal implementation**
Append `CallLog` model with enum values `CallType (AUDIO, VIDEO)` and `CallStatus` to `src/database/prisma/schema.prisma`. Register relations on the `User` model.

Run migration:
```bash
npm run prisma:generate
npm run prisma:migrate -- --name add_call_logs
```

**Step 4: Run test to verify it passes**
Run: `npm test tests/database/calling.schema.test.ts`

**Step 5: Commit**
```bash
git add src/database/prisma/schema.prisma tests/database/calling.schema.test.ts
git commit -m "db: implement call logs schema structures"
```

---

### Task 2: Dynamic ICE/TURN Server Configurations API

Expose secure dynamic TURN access credentials for client connections to bypass symmetric NAT firewalls.

**Files:**
- Create: `src/modules/calling/calling.controller.ts`
- Create: `src/modules/calling/calling.routes.ts`
- Modify: `src/routes/index.ts`
- Test: `tests/modules/calling/ice.api.test.ts`

**Step 1: Write the failing test**
Assert that requesting ICE config returns short-lived time-sensitive credentials.

Create `tests/modules/calling/ice.api.test.ts`:
```typescript
import request from 'supertest';
import app from '../../../src/app';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('ICE Server Config REST API', () => {
  let token: string;
  beforeAll(() => {
    token = jwt.sign({ userId: 'voice-user-id', email: 'v@t.com' }, env.JWT_ACCESS_SECRET);
  });

  it('should generate secure dynamic credentials for TURN', async () => {
    const res = await request(app)
      .get('/api/v1/chats/calling/ice-servers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.iceServers.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `npm test tests/modules/calling/ice.api.test.ts`

**Step 3: Write minimal implementation**
1. Implement `CallingController` in `src/modules/calling/calling.controller.ts` to compute HMAC-SHA1 signature username/password pairs for your coturn or Metered.ca TURN server.
2. Setup routes and mount router under `src/routes/index.ts`.

**Step 4: Run test to verify it passes**
Run: `npm test tests/modules/calling/ice.api.test.ts`

**Step 5: Commit**
```bash
git add src/modules/calling/ src/routes/index.ts tests/modules/calling/ice.api.test.ts
git commit -m "feat: implement dynamic ICE server credentials API endpoint"
```

---

### Task 3: 1-to-1 WebRTC Voice Call Signaling & Sockets

Implement Socket.IO signaling event handlers and offline call push alerts.

**Files:**
- Create: `src/modules/calling/calling.socket.ts`
- Modify: `src/server.ts`
- Test: `tests/modules/calling/calling.socket.test.ts`

**Step 1: Write the failing test**
Verify forwarding of voice calls signaling SDP offer/answers and candidates, and enqueuing background pushes if the receiver is offline.

Create `tests/modules/calling/calling.socket.test.ts`:
```typescript
import { io as ioClient, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Calling Sockets Signaling', () => {
  let caller: Socket;
  let receiver: Socket;

  beforeAll((done) => {
    const t1 = jwt.sign({ userId: 'c1', email: 'c1@t.com' }, env.JWT_ACCESS_SECRET);
    const t2 = jwt.sign({ userId: 'r1', email: 'r1@t.com' }, env.JWT_ACCESS_SECRET);

    caller = ioClient('http://localhost:3000', { auth: { token: t1 } });
    receiver = ioClient('http://localhost:3000', { auth: { token: t2 } });

    let connected = 0;
    const checkConnect = () => {
      connected++;
      if (connected === 2) done();
    };

    caller.on('connect', checkConnect);
    receiver.on('connect', checkConnect);
  });

  afterAll(() => {
    caller.disconnect();
    receiver.disconnect();
  });

  it('should forward signaling events to correct receiver room', (done) => {
    receiver.on('call:incoming', (data) => {
      expect(data.callerId).toBe('c1');
      expect(data.type).toBe('AUDIO');
      done();
    });

    caller.emit('call:start', { receiverId: 'r1', sdp: 'sdp-offer', type: 'AUDIO', conversationId: 'a6b986ff-944a-4e2e-b3d4-4bb8df38596f' });
  });
});
```

**Step 2: Run test to verify it fails**
Run: `npm test tests/modules/calling/calling.socket.test.ts`

**Step 3: Write minimal implementation**
1. Create `src/modules/calling/calling.socket.ts`:
   - `call:start`: Check if recipient is online in Redis. If offline, dispatch push alert via BullMQ. If online, send socket event.
   - `call:accept`: Relay response SDP.
   - `call:reject`: Transition call state.
   - `call:signal`: Forward SDP/ICE candidate packets.
   - `call:end`: Close call, compute duration, update database status.
2. Hook handlers into `src/server.ts` connection blocks.

**Step 4: Run test to verify it passes**
Run: `npm test tests/modules/calling/calling.socket.test.ts`

**Step 5: Commit**
```bash
git add src/modules/calling/calling.socket.ts src/server.ts tests/modules/calling/calling.socket.test.ts
git commit -m "feat: implement WebRTC voice calling signaling sockets and offline call notifications"
```
