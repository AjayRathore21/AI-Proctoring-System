# Architecture Overview

## 🏗️ Application Architecture

This is a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  (React Components - UI only, no business logic)           │
│  • AuthPage, LobbyPage, CallPage                            │
│  • VideoGrid, CallControls (presentational components)     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    HOOKS LAYER                              │
│  (React hooks - bridge between UI and services)             │
│  • useWebRTC, useRoom, useRecording, useAuth               │
│  • Manages React state, lifecycle, side effects            │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    SERVICES LAYER                           │
│  (Pure business logic - no React dependency)                 │
│  • WebRTCService, RoomService, AuthService                 │
│  • RecordingService, FirebaseService                        │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                     │
│  • Firebase (Auth, Firestore, Storage)                     │
│  • WebRTC APIs (getUserMedia, RTCPeerConnection)           │
│  • Browser APIs                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
src/
├── app/                      # Application shell
│   ├── App.tsx              # Root component with AuthProvider
│   └── Router.tsx           # Route definitions
│
├── features/                 # Feature-based organization
│   ├── auth/                # Authentication feature
│   │   ├── AuthPage.tsx     # Login/Register page
│   │   └── components/      # LoginForm, RegisterForm
│   │
│   └── room/                # Video calling feature
│       ├── LobbyPage.tsx    # Create/Join room
│       ├── CallPage.tsx     # Active call screen
│       └── components/      # VideoGrid, CallControls
│
├── services/                 # Pure business logic (framework-agnostic)
│   ├── firebase.service.ts  # Firebase initialization
│   ├── auth.service.ts      # Authentication operations
│   ├── room.service.ts      # Room CRUD + Firestore subscriptions
│   ├── webrtc.service.ts    # WebRTC peer connection management
│   └── recording.service.ts # Media recording + upload
│
├── hooks/                    # React hooks (bridge services ↔ components)
│   ├── useRoom.ts           # Room state management
│   ├── useWebRTC.ts         # WebRTC connection lifecycle
│   └── useRecording.ts      # Recording state management
│
├── context/                  # React Context providers
│   └── AuthContext.tsx      # Global auth state
│
├── components/               # Reusable UI components
│   └── ui/                  # Button, Input, Spinner, etc.
│
├── routes/                   # Route guards
│   ├── ProtectedRoute.tsx   # Requires authentication
│   └── PublicRoute.tsx     # Redirects if authenticated
│
└── types/                    # TypeScript type definitions
    └── index.ts
```

---

## 🔄 Data Flow Architecture

### 1. **Authentication Flow**
```
User → AuthPage → useAuthForm → authService → Firebase Auth
                                      ↓
                              AuthContext (global state)
                                      ↓
                              All components via useAuth()
```

### 2. **Room Creation Flow**
```
LobbyPage → useRoom.createRoom() → roomService.createRoom()
                                      ↓
                              Firestore: /rooms/{roomId}
                                      ↓
                              Navigate to /call/{roomId}?role=caller
```

### 3. **WebRTC Connection Flow** (Detailed below)

---

## 🎥 P2P Connection Flow - Step by Step

### **Phase 1: Initialization**

#### **Caller Side (User A):**
1. **LobbyPage** → User clicks "Create Room"
   - `useRoom.createRoom()` → Creates Firestore document
   - Navigates to `/call/{roomId}?role=caller`

2. **CallPage** mounts with `role="caller"`
   - `useWebRTC` hook initializes:
     ```typescript
     // Line 93-126: Get camera/microphone
     navigator.mediaDevices.getUserMedia({ video: true, audio: true })
     → Sets localStream state
     ```

3. **CallPage** effect triggers `startCall()`:
   ```typescript
   // Line 61-72: Auto-start when localStream ready
   useEffect(() => {
     if (localStream && role === "caller") {
       startCall(); // ← Triggers WebRTC setup
     }
   }, [localStream, role]);
   ```

#### **Callee Side (User B):**
1. **LobbyPage** → User enters roomId and clicks "Join"
   - `useRoom.joinRoom(roomId)` → Updates Firestore:
     - Sets `joinedBy`, `sessionId`, `startedAt`
     - Changes `status: "waiting" → "active"`

2. Navigates to `/call/{roomId}?role=callee`

3. **CallPage** mounts with `role="callee"`
   - Same `getUserMedia()` call → Gets localStream
   - Waits for `room.status === "active"` before starting

---

### **Phase 2: WebRTC Peer Connection Setup**

#### **Caller Side - `startCall()` execution:**

```typescript
// useWebRTC.ts - Line 130-159
const startCall = async () => {
  // 1. Create WebRTCService instance
  const service = new WebRTCService(roomId);
  
  // 2. Create RTCPeerConnection
  service.createPeerConnection(handleRemoteStream);
  //    ↓ Creates: new RTCPeerConnection({ iceServers: STUN_SERVERS })
  //    ↓ Sets up: pc.ontrack handler for incoming remote media
  
  // 3. Add local tracks to peer connection
  service.addTracks(localStream);
  //    ↓ Adds camera + microphone tracks to RTCPeerConnection
  
  // 4. Create and send offer (caller initiates)
  await service.createOffer();
}
```

#### **Inside `createOffer()` (WebRTCService):**

```typescript
// webrtc.service.ts - Line 106-159
async createOffer() {
  // STEP 1: Set up ICE candidate handler
  this.pc.onicecandidate = async ({ candidate }) => {
    if (!candidate) return;
    // Push each ICE candidate to Firestore as it's discovered
    await addDoc(CALLER_CANDIDATES_PATH(roomId), {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
    });
  };
  
  // STEP 2: Create SDP offer
  const offer = await this.pc.createOffer();
  //    ↓ Browser generates SDP with media capabilities
  
  // STEP 3: Set local description (triggers ICE gathering)
  await this.pc.setLocalDescription(offer);
  //    ↓ ICE gathering starts automatically
  
  // STEP 4: Write offer to Firestore (signaling channel)
  await setDoc(SIGNAL_DOC_PATH(roomId), {
    offer: { type: offer.type, sdp: offer.sdp },
    answer: null,
  });
  //    ↓ Firestore: /rooms/{roomId}/signal/data
  
  // STEP 5: Listen for answer from callee
  onSnapshot(SIGNAL_DOC_PATH(roomId), async (snap) => {
    const data = snap.data();
    if (data?.answer) {
      await this.pc.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
    }
  });
  
  // STEP 6: Listen for callee ICE candidates
  onSnapshot(CALLEE_CANDIDATES_PATH(roomId), (snap) => {
    snap.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        await this.pc.addIceCandidate(
          new RTCIceCandidate(change.doc.data())
        );
      }
    });
  });
}
```

---

#### **Callee Side - `startCall()` execution:**

```typescript
// useWebRTC.ts - Line 130-159
const startCall = async () => {
  // Same setup as caller...
  const service = new WebRTCService(roomId);
  service.createPeerConnection(handleRemoteStream);
  service.addTracks(localStream);
  
  // But creates ANSWER instead
  await service.createAnswer();
}
```

#### **Inside `createAnswer()` (WebRTCService):**

```typescript
// webrtc.service.ts - Line 167-215
async createAnswer() {
  // STEP 1: Set up ICE candidate handler (for callee candidates)
  this.pc.onicecandidate = async ({ candidate }) => {
    if (!candidate) return;
    await addDoc(CALLEE_CANDIDATES_PATH(roomId), {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
    });
  };
  
  // STEP 2: Read offer from Firestore
  const signalSnap = await getDoc(SIGNAL_DOC_PATH(roomId));
  const { offer } = signalSnap.data();
  
  // STEP 3: Set remote description (caller's offer)
  await this.pc.setRemoteDescription(
    new RTCSessionDescription(offer)
  );
  
  // STEP 4: Create SDP answer
  const answer = await this.pc.createAnswer();
  
  // STEP 5: Set local description (triggers ICE gathering)
  await this.pc.setLocalDescription(answer);
  
  // STEP 6: Write answer back to Firestore
  await updateDoc(SIGNAL_DOC_PATH(roomId), {
    answer: { type: answer.type, sdp: answer.sdp },
  });
  
  // STEP 7: Listen for caller ICE candidates
  onSnapshot(CALLER_CANDIDATES_PATH(roomId), (snap) => {
    snap.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        await this.pc.addIceCandidate(
          new RTCIceCandidate(change.doc.data())
        );
      }
    });
  });
}
```

---

### **Phase 3: ICE Candidate Exchange**

**Firestore Structure:**
```
/rooms/{roomId}/
  └── signal/
      └── data/                    ← SDP offer/answer
          ├── callerCandidates/     ← Caller ICE candidates
          │   ├── {candidate1}
          │   ├── {candidate2}
          │   └── ...
          └── calleeCandidates/     ← Callee ICE candidates
              ├── {candidate1}
              ├── {candidate2}
              └── ...
```

**Flow:**
1. **Caller** discovers ICE candidates → Writes to `callerCandidates/`
2. **Callee** listens via `onSnapshot` → Calls `addIceCandidate()` on peer connection
3. **Callee** discovers ICE candidates → Writes to `calleeCandidates/`
4. **Caller** listens via `onSnapshot` → Calls `addIceCandidate()` on peer connection
5. WebRTC uses ICE candidates to establish direct P2P connection

---

### **Phase 4: Connection Established**

**When connection succeeds:**
1. `RTCPeerConnection.ontrack` fires (set up in `createPeerConnection`)
2. Remote media tracks arrive → Added to `remoteStream`
3. `handleRemoteStream()` callback invoked → Updates React state
4. `CallPage` receives `remoteStream` → Displays in `VideoGrid`
5. Call state changes to `"connected"` → Timer starts

---

## 🔗 Function Call Sequence Diagram

```
CALLER SIDE                          FIRESTORE                    CALLEE SIDE
─────────────────────────────────────────────────────────────────────────────

[1] CallPage mounts
    ↓
[2] useWebRTC hook initializes
    ↓
[3] getUserMedia() → localStream
    ↓
[4] startCall() called
    ↓
[5] new WebRTCService(roomId)
    ↓
[6] createPeerConnection()
    ↓
[7] addTracks(localStream)
    ↓
[8] createOffer()
    │
    ├─→ [9] pc.createOffer()
    │
    ├─→ [10] pc.setLocalDescription(offer)
    │        (triggers ICE gathering)
    │
    ├─→ [11] setDoc() → /rooms/{roomId}/signal/data
    │        { offer: {...}, answer: null }
    │                                    │
    │                                    │ [12] onSnapshot fires
    │                                    │      (callee detects offer)
    │                                    ↓
    │                            [13] createAnswer()
    │                                    │
    │                                    ├─→ [14] getDoc() → Read offer
    │                                    │
    │                                    ├─→ [15] pc.setRemoteDescription(offer)
    │                                    │
    │                                    ├─→ [16] pc.createAnswer()
    │                                    │
    │                                    ├─→ [17] pc.setLocalDescription(answer)
    │                                    │        (triggers ICE gathering)
    │                                    │
    │                                    └─→ [18] updateDoc() → Set answer
    │                                                          │
    │                                                          │ [19] onSnapshot fires
    │                                                          │      (caller detects answer)
    │                                                          ↓
    │                                                  [20] pc.setRemoteDescription(answer)
    │
    ├─→ [21] ICE candidates discovered (async)
    │        onicecandidate fires
    │        ↓
    │        addDoc() → /rooms/{roomId}/signal/data/callerCandidates/{id}
    │                                                          │
    │                                                          │ [22] onSnapshot fires
    │                                                          │      (callee receives candidate)
    │                                                          ↓
    │                                                  [23] pc.addIceCandidate()
    │
    └─→ [24] Listening for callee candidates
         onSnapshot(CALLEE_CANDIDATES_PATH)
         │
         │ [25] Callee ICE candidates discovered
         │      addDoc() → /rooms/{roomId}/signal/data/calleeCandidates/{id}
         │      │
         │      │ [26] onSnapshot fires (caller receives)
         │      ↓
         │      [27] pc.addIceCandidate()
         │
         └─→ [28] P2P connection established!
              ↓
         [29] pc.ontrack fires → Remote media arrives
              ↓
         [30] handleRemoteStream() → Update React state
              ↓
         [31] VideoGrid displays both streams
```

---

## 🎯 Key Design Patterns

### 1. **Separation of Concerns**
- **Services**: Pure business logic, no React dependencies
- **Hooks**: React-specific state management, bridge to services
- **Components**: Presentation only, delegate to hooks

### 2. **Firestore as Signaling Channel**
- WebRTC requires signaling to exchange SDP and ICE candidates
- Instead of WebSocket server, uses Firestore real-time listeners
- Firestore paths:
  - `/rooms/{roomId}/signal/data` → SDP offer/answer
  - `/rooms/{roomId}/signal/data/callerCandidates/{id}` → Caller ICE
  - `/rooms/{roomId}/signal/data/calleeCandidates/{id}` → Callee ICE

### 3. **Class-based WebRTCService**
- Single stateful instance per call
- Encapsulates RTCPeerConnection lifecycle
- Easy to test (no React dependencies)

### 4. **React Hooks Pattern**
- `useWebRTC`: Manages WebRTCService instance via `useRef`
- `useRoom`: Manages Firestore subscriptions
- `useRecording`: Manages MediaRecorder lifecycle

### 5. **Real-time Synchronization**
- Firestore `onSnapshot` listeners for reactive updates
- Room status changes trigger UI updates automatically
- Both sides detect when call ends

---

## 🔐 Security & Best Practices

1. **Firebase Security Rules**: Protect Firestore collections
2. **HTTPS Required**: getUserMedia only works in secure contexts
3. **Cleanup**: All listeners unsubscribe on unmount
4. **Error Handling**: Try-catch blocks with user-friendly messages
5. **Type Safety**: Full TypeScript coverage

---

## 📊 State Management Flow

```
Component State (React)
    ↕
Hook State (useState, useRef)
    ↕
Service Operations (async functions)
    ↕
Firebase/Firestore (persistent state)
    ↕
Real-time Updates (onSnapshot)
    ↕
Hook State Updates
    ↕
Component Re-renders
```

---

This architecture ensures:
- ✅ **Testability**: Services can be tested independently
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Scalability**: Easy to add features without coupling
- ✅ **Type Safety**: Full TypeScript coverage
- ✅ **Real-time**: Firestore listeners for reactive updates
