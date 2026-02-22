/**
 * RoomService — manages Firestore room documents.
 *
 * Responsibilities:
 *  - Create a room document (caller side)
 *  - Join a room (callee side), assigning a sessionId
 *  - Subscribe to room changes for reactive UI updates
 *  - End a room and persist metadata (duration, recordingUrl)
 *
 * Firestore path:  /rooms/{roomId}
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "./firebase.service";
import type { Room, RoomStatus } from "../types";

const ROOMS_COLLECTION = "rooms";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toRoom = (snap: DocumentSnapshot): Room | null => {
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    roomId: snap.id,
    createdBy: data.createdBy,
    joinedBy: data.joinedBy ?? null,
    sessionId: data.sessionId ?? null,
    startedAt: data.startedAt instanceof Timestamp
      ? data.startedAt.toMillis()
      : data.startedAt ?? null,
    endedAt: data.endedAt instanceof Timestamp
      ? data.endedAt.toMillis()
      : data.endedAt ?? null,
    duration: data.duration ?? null,
    status: (data.status as RoomStatus) ?? "waiting",
    recordingUrl: data.recordingUrl ?? null,
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const roomService = {
  /**
   * Creates a new room document in Firestore.
   * Returns the generated roomId so the caller can share it.
   */
  async createRoom(createdBy: string): Promise<string> {
    const roomId = uuidv4();
    const roomRef = doc(collection(db, ROOMS_COLLECTION), roomId);

    const roomData: Omit<Room, "roomId"> = {
      createdBy,
      joinedBy: null,
      sessionId: null,
      startedAt: null,
      endedAt: null,
      duration: null,
      status: "waiting",
      recordingUrl: null,
    };

    await setDoc(roomRef, roomData);
    return roomId;
  },

  /**
   * Validates that the room exists and has not already been joined.
   * Throws descriptive errors that the UI can surface directly.
   */
  async validateRoom(roomId: string, joiningUserId: string): Promise<Room> {
    const snap = await getDoc(doc(db, ROOMS_COLLECTION, roomId));
    const room = toRoom(snap);

    if (!room) throw new Error("Room not found. Check the room ID and try again.");
    if (room.status === "ended") throw new Error("This call has already ended.");
    if (room.joinedBy && room.joinedBy !== joiningUserId) {
      throw new Error("This room already has two participants.");
    }
    if (room.createdBy === joiningUserId) {
      throw new Error("You cannot join your own room as a second participant.");
    }

    return room;
  },

  /**
   * Marks the room as active, persists sessionId, and records the startedAt
   * timestamp. This is called exclusively by the joining participant (User B).
   */
  async joinRoom(roomId: string, joiningUserId: string): Promise<string> {
    const sessionId = uuidv4();

    await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
      joinedBy: joiningUserId,
      sessionId,
      startedAt: serverTimestamp(),
      status: "active" as RoomStatus,
    });

    return sessionId;
  },

  /**
   * Fetches a room once (used by the creator to check join status).
   */
  async getRoom(roomId: string): Promise<Room | null> {
    const snap = await getDoc(doc(db, ROOMS_COLLECTION, roomId));
    return toRoom(snap);
  },

  /**
   * Ends the call: records endedAt, duration, status, and optionally
   * the recording URL.
   */
  async endRoom(
    roomId: string,
    startedAtMs: number,
    recordingUrl: string | null
  ): Promise<void> {
    const now = Date.now();
    const duration = Math.floor((now - startedAtMs) / 1000);

    await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
      status: "ended" as RoomStatus,
      endedAt: serverTimestamp(),
      duration,
      ...(recordingUrl ? { recordingUrl } : {}),
    });
  },

  /**
   * Real-time listener for a room document.
   * Returns an unsubscribe function — always call it on component unmount.
   */
  subscribeToRoom(
    roomId: string,
    onUpdate: (room: Room | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    return onSnapshot(
      doc(db, ROOMS_COLLECTION, roomId),
      (snap) => onUpdate(toRoom(snap)),
      (err) => onError?.(err)
    );
  },
};
