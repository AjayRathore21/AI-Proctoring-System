/**
 * Central type definitions for the video calling system.
 * Keeping all domain types in one place enables a single source of truth
 * and makes cross-feature type sharing trivial without circular imports.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends AuthCredentials {
  displayName: string;
}

// ─── Room ────────────────────────────────────────────────────────────────────

export type RoomStatus = "waiting" | "active" | "ended";

export interface Room {
  roomId: string;
  createdBy: string;        // uid of the creator
  joinedBy: string | null;  // uid of the second participant
  sessionId: string | null;
  startedAt: number | null; // Unix ms – set when second participant joins
  endedAt: number | null;
  duration: number | null;  // seconds
  status: RoomStatus;
  recordingUrl: string | null;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface Session {
  sessionId: string;
  roomId: string;
  participants: [string, string]; // [creatorUid, joinerUid]
  startedAt: number;
  endedAt: number | null;
  recordingUrl: string | null;
}

// ─── WebRTC / Signaling ───────────────────────────────────────────────────────

export interface SignalData {
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
}

export interface IceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface CallControls {
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
}

export interface CallState {
  status: "idle" | "connecting" | "connected" | "ended" | "error";
  error: string | null;
  durationSeconds: number;
}
