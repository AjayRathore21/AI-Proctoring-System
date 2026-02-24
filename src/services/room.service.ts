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
import type {
  Room,
  RoomStatus,
  InterviewStats,
  EventLogEntry,
  ItemDetectionCounts,
} from "../types";

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
    startedAt:
      data.startedAt instanceof Timestamp
        ? data.startedAt.toMillis()
        : (data.startedAt ?? null),
    endedAt:
      data.endedAt instanceof Timestamp
        ? data.endedAt.toMillis()
        : (data.endedAt ?? null),
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

    if (!room)
      throw new Error("Room not found. Check the room ID and try again.");
    if (room.status === "ended")
      throw new Error("This call has already ended.");
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

    // Log the start of the session
    await this.addEventLog(roomId, {
      timestamp: new Date().toLocaleTimeString(),
      description: "Interview session started",
      severity: "normal",
      eventType: "session_start",
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
    recordingUrl: string | null,
  ): Promise<void> {
    const now = Date.now();
    const duration = Math.floor((now - startedAtMs) / 1000);

    await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
      status: "ended" as RoomStatus,
      endedAt: serverTimestamp(),
      duration,
      ...(recordingUrl ? { recordingUrl } : {}),
    });

    // Log the end of the session
    await this.addEventLog(roomId, {
      timestamp: new Date().toLocaleTimeString(),
      description: `Interview session ended. Duration: ${duration}s`,
      severity: "normal",
      eventType: "session_end",
    });
  },

  /**
   * Real-time listener for a room document.
   * Returns an unsubscribe function — always call it on component unmount.
   */
  subscribeToRoom(
    roomId: string,
    onUpdate: (room: Room | null) => void,
    onError?: (error: Error) => void,
  ): () => void {
    return onSnapshot(
      doc(db, ROOMS_COLLECTION, roomId),
      (snap) => onUpdate(toRoom(snap)),
      (err) => onError?.(err),
    );
  },

  /**
   * Updates or initializes the interview stats for a room.
   */
  async updateInterviewStats(
    roomId: string,
    stats: Partial<InterviewStats>,
  ): Promise<void> {
    const statsRef = doc(db, ROOMS_COLLECTION, roomId, "monitoring", "stats");
    await setDoc(statsRef, stats, { merge: true });
  },

  /**
   * Adds a new event log entry to the room's monitoring.
   */
  async addEventLog(
    roomId: string,
    entry: Omit<EventLogEntry, "id">,
  ): Promise<void> {
    // 0. Initial check
    if (!roomId) {
      console.error("[addEventLog] FATAL: roomId is missing");
      return;
    }

    console.log(
      "[addEventLog] START - RoomID:",
      roomId,
      "EventType:",
      entry.eventType,
    );

    try {
      // 1. Path construction check
      const collectionPath = ROOMS_COLLECTION;
      const docPath = roomId;
      const subCollection = "monitoring";
      const subDoc = "stats";

      console.log("[addEventLog] Segments:", {
        collectionPath,
        docPath,
        subCollection,
        subDoc,
      });

      // 2. Reference creation
      const statsRef = doc(db, collectionPath, docPath, subCollection, subDoc);
      console.log("[addEventLog] SUCCESS: statsRef created");

      // 3. Fetch current state
      console.log("[addEventLog] Fetching current doc...");
      const snap = await getDoc(statsRef);
      const existingData = snap.data() as InterviewStats | undefined;
      console.log("[addEventLog] Doc exists:", snap.exists());

      // 4. Prepare new entry
      let newId;
      try {
        newId = uuidv4();
      } catch (e) {
        console.error("[addEventLog] uuidv4 failed", e);
        newId = Math.random().toString(36).substring(7);
      }

      const newEntry: EventLogEntry = {
        ...entry,
        id: newId,
      };

      // 5. Build log array
      const currentLog = existingData?.eventLog || [];
      const updatedLog = [newEntry, ...currentLog].slice(0, 50);

      // 6. Build item detected counters
      const counters: ItemDetectionCounts = {
        mobilePhone: existingData?.itemDetection?.mobilePhone || 0,
        notesBooks: existingData?.itemDetection?.notesBooks || 0,
        extraElectronics: existingData?.itemDetection?.extraElectronics || 0,
        smartwatch: existingData?.itemDetection?.smartwatch || 0,
      };

      const type = entry.eventType.toLowerCase();
      if (type.includes("mobile") || type.includes("phone"))
        counters.mobilePhone += 1;
      else if (type.includes("book") || type.includes("note"))
        counters.notesBooks += 1;
      else if (type.includes("electronic")) counters.extraElectronics += 1;
      else if (type.includes("smartwatch") || type.includes("watch"))
        counters.smartwatch += 1;

      // 7. Execute Save
      const payload = {
        eventLog: updatedLog,
        itemDetection: counters,
      };

      console.log("[addEventLog] Final write payload:", payload);
      await setDoc(statsRef, payload, { merge: true });
      console.log("[addEventLog] FINISHED - Event saved successfully");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("[addEventLog] CRITICAL FAILURE:", error);
      // Fallback: try minimal log if complex one fails
      try {
        console.log("[addEventLog] Attempting emergency minimal log...");
        const emergencyRef = doc(
          db,
          ROOMS_COLLECTION,
          roomId,
          "monitoring",
          "stats",
        );
        await setDoc(
          emergencyRef,
          {
            lastError: error.message || "Unknown error",
            errorTime: new Date().toISOString(),
          },
          { merge: true },
        );
      } catch (innerErr) {
        console.error("[addEventLog] Emergency log failed too", innerErr);
      }
    }
  },

  /**
   * Subscribes to interview stats for a room.
   */
  subscribeToInterviewStats(
    roomId: string,
    onUpdate: (stats: InterviewStats | null) => void,
  ): () => void {
    const statsRef = doc(db, ROOMS_COLLECTION, roomId, "monitoring", "stats");
    return onSnapshot(statsRef, (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as InterviewStats);
      } else {
        onUpdate(null);
      }
    });
  },
};
