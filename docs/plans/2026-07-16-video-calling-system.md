# Plan 3: 1-to-1 Video Calling System

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal: Implement a secure, low-cost 1-to-1 video calling system featuring direct audio/video streams. Supports either **Direct WebRTC P2P** or **LiveKit SFU** connections.

Node.js Backend & Flutter Frontend Split:

- **Backend (Node.js, Express, TypeScript)**:
  - For WebRTC P2P: Relays signaling SDPs through Socket.io and generates temporary coturn TURN credentials.
  - For LiveKit Option: Generates short-lived Access Tokens using `livekit-server-sdk` to authorize video rooms.
  - Verifies conversation member whitelisting before enabling calls.
  - Enqueues BullMQ background tasks to fire FCM pushes if the recipient is offline.
  - Logs completed call sessions (`type: VIDEO`) in PostgreSQL.
  - Sockets listen for device-local telemetry flags (`call:flag`), updating the database record as `isFlagged: true` for admin audit.
- **Frontend (Flutter Mobile App)**:
  - If P2P: Establishes Peer Connections using the `flutter_webrtc` package.
  - If LiveKit Option: Instantiates video rooms using the `livekit_client` package and fetches connection tokens from the backend.
  - Runs local, device-only frame classification using **TensorFlow Lite (TFLite)** + **NSFW-TFLite** model (disabled by default, enabled on-demand).
  - If nsfw classes are flagged on-device: blurs local screen frame and emits `call:flag` event to the socket server.

**Budget-Oriented & Free Tier Services (Options):**

- **Option A: Pure WebRTC P2P (Default)**
  - *Media Streaming*: Audio/video data streams directly device-to-device. Server bandwidth = **$0**.
  - *STUN/TURN*: Google Public STUN ($0) + Metered.ca (50GB free tier/mo).
- **Option B: LiveKit Integration (Alternative)**
  - *LiveKit Cloud*: Generous **50 GB/month FREE tier** of video/audio bandwidth, including high-availability STUN/TURN configurations.
  - *Self-Hosted fallback*: Run the open-source LiveKit Server on a cheap $5/mo VPS for infinite scaling with no licensing costs.
  - *Token generation*: Runs on the backend Express server at **$0** monthly cost.
- **Client-Side Moderation**: **TensorFlow Lite (TFLite)** + **NSFW-TFLite** model loaded locally on the Flutter mobile client. Avoids expensive server GPU classification. Compute cost = **$0**.
- **Background Wakeup**: **FCM Push Notifications** (100% Free) to wake up backgrounded Flutter apps during incoming calls.

**Architecture:**

- **P2P Video Streaming**: Video and audio data runs browser-to-browser via WebRTC, resulting in **$0 server media/bandwidth costs**.
- **Signaling Server**: Relays WebRTC signaling payloads (`call:start` with `type: VIDEO`, `call:accept`, `call:signal`) through Socket.io. Validates that users are whitelisted conversation members.
- **Dynamic TURN configuration**: Dynamic credentials generation on the server side (`GET /api/v1/chats/calling/ice-servers`) to bypass symmetric NAT firewalls.
- **FCM Push Notification (BullMQ)**: If the recipient is offline, the socket server enqueues a push notification task in **BullMQ** to wake up the Flutter app with a high-priority call invitation payload.
- **Optional Client-Side ML Moderation (Disabled by Default)**:
  - To prevent server slowdowns and compute costs, video streams are scanned on the mobile client (using TensorFlow Lite / MobileNet locally on the device).
  - Call start events accept an optional `moderationEnabled: boolean` parameter.
  - If a violation is flagged on the device, the Flutter app blurs the screen and sends a socket event `call:flag` to the server. The server updates the database call log (`isFlagged: true`, `flaggedReason: reason`) for admin audits.

**Tech Stack:** Node.js, Express, TypeScript, Prisma, Redis, BullMQ, WebRTC (audio + video), Firebase Admin SDK.

Flutter Client Compatibility Rules:

- **High-Priority FCM Wakes**: In video calling, incoming call notifications must be marked with FCM `"priority": "high"` and APNS `"apns-priority": "10"` headers to wake the client app from sleep modes to display the incoming ring interface.
- **Dynamic ICE configuration**: Ensure the `/ice-servers` API response structure directly matches the `RTCConfiguration` input requirements of the `flutter_webrtc` package, formatting the URIs as: `{"urls": ["turn:domain:port"], "username": "...", "credential": "..."}`.
- **Signaling Relays**: WebRTC signaling events (`call:signal`) must relay raw SDP and ICE candidate JSON values without formatting edits to prevent decoder mismatches inside the `flutter_webrtc` client.
- **ML Telemetry Flags**: The backend `call:flag` socket event listener must parse structured payloads matching standard on-device image classifier outputs (e.g. `{"callId": "...", "confidence": 0.89, "label": "pornography"}`) to record flagged states correctly in the database.

---

## Detailed Component Plans

### Task 1: Database Migration & Schema Design (Video Logs)

Define database models and relations for video call logging and moderation flags.

**Files:**

- Modify: `src/database/prisma/schema.prisma`
- Test: `tests/database/video.calling.schema.test.ts`

**Step 1: Write the failing test**
Create `tests/database/video.calling.schema.test.ts` to assert that video call logs with `moderationEnabled` and `isFlagged` flags can be created.

**Step 2: Run test to verify it fails**
Run: `npm test tests/database/video.calling.schema.test.ts`

**Step 3: Write minimal implementation**
Append `CallLog` model with `CallType` enum (AUDIO/VIDEO), `CallStatus`, `moderationEnabled`, `isFlagged`, and `flaggedReason` fields to `src/database/prisma/schema.prisma`. Register relations on the `User` model.

Run migration:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name add_video_call_logs
```

**Step 4: Run test to verify it passes**
Run: `npm test tests/database/video.calling.schema.test.ts`

**Step 5: Commit**

```bash
git add src/database/prisma/schema.prisma tests/database/video.calling.schema.test.ts
git commit -m "db: implement video call logs and moderation schemas"
```

---

### Task 2: 1-to-1 WebRTC Video Call Sockets & Telemetry Flagging

Implement Socket.IO signaling event handlers, client telemetry flags, and offline call push alerts.

**Files:**

- Create: `src/modules/calling/calling.socket.ts`
- Modify: `src/server.ts`
- Test: `tests/modules/calling/video.calling.socket.test.ts`

**Step 1: Write the failing test**
Verify forwarding of video call signals (`type: VIDEO`), enqueuing push notifications if recipient is offline, and logging telemetry flags.

Create `tests/modules/calling/video.calling.socket.test.ts`:

```typescript
import { io as ioClient, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Video Calling Sockets Signaling', () => {
  let caller: Socket;
  let receiver: Socket;

  beforeAll((done) => {
    const t1 = jwt.sign({ userId: 'vc1', email: 'vc1@t.com' }, env.JWT_ACCESS_SECRET);
    const t2 = jwt.sign({ userId: 'vr1', email: 'vr1@t.com' }, env.JWT_ACCESS_SECRET);

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

  it('should forward video signaling events and support moderation flags', (done) => {
    receiver.on('call:incoming', (data) => {
      expect(data.callerId).toBe('vc1');
      expect(data.type).toBe('VIDEO');
      expect(data.moderationEnabled).toBe(true);
      done();
    });

    caller.emit('call:start', { receiverId: 'vr1', sdp: 'sdp-offer', type: 'VIDEO', conversationId: 'a6b986ff-944a-4e2e-b3d4-4bb8df38596f', moderationEnabled: true });
  });
});
```

**Step 2: Run test to verify it fails**
Run: `npm test tests/modules/calling/video.calling.socket.test.ts`

**Step 3: Write minimal implementation**

1. Create `src/modules/calling/calling.socket.ts`:
   - `call:start`: Check if recipient is online. If offline, dispatch push alert via BullMQ. If online, send socket event with `moderationEnabled` flag (defaults to `false`).
   - `call:flag`: Log call telemetry flags reported by client device local ML scanners.
   - `call:signal`: Forward SDP/ICE candidate packets.
   - `call:end`: Close call, compute duration, update database status.
2. Hook handlers into `src/server.ts` connection blocks.

**Step 4: Run test to verify it passes**
Run: `npm test tests/modules/calling/video.calling.socket.test.ts`

**Step 5: Commit**

```bash
git add src/modules/calling/calling.socket.ts src/server.ts tests/modules/calling/video.calling.socket.test.ts
git commit -m "feat: implement WebRTC video calling signaling sockets and client telemetry flag logs"
```
