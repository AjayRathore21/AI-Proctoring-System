/**
 * useRoom — orchestrates room creation, joining, and real-time state sync.
 *
 * This hook is the bridge between the RoomService (pure async logic) and
 * React components. It owns:
 *  - Loading / error state
 *  - Real-time Firestore subscription lifecycle
 *  - Returning typed action functions to components
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { roomService } from "../services/room.service";
import { useAuth } from "../context/AuthContext";
import type { Room } from "../types";

interface UseRoomReturn {
  room: Room | null;
  isLoading: boolean;
  error: string | null;
  createRoom: () => Promise<string>;
  joinRoom: (roomId: string) => Promise<string>;
  endRoom: (recordingUrl: string | null) => Promise<void>;
  subscribeToRoom: (roomId: string) => void;
  clearError: () => void;
}

export const useRoom = (): UseRoomReturn => {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the unsubscribe fn in a ref so it doesn't trigger re-renders.
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ─── Create ─────────────────────────────────────────────────────────────

  const createRoom = useCallback(async (): Promise<string> => {
    if (!user) throw new Error("You must be signed in to create a room.");
    setIsLoading(true);
    setError(null);
    try {
      const roomId = await roomService.createRoom(user.uid);
      return roomId;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create room.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ─── Join ────────────────────────────────────────────────────────────────

  const joinRoom = useCallback(async (roomId: string): Promise<string> => {
    if (!user) throw new Error("You must be signed in to join a room.");
    setIsLoading(true);
    setError(null);
    try {
      await roomService.validateRoom(roomId, user.uid);
      const sessionId = await roomService.joinRoom(roomId, user.uid);
      return sessionId;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join room.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ─── End ─────────────────────────────────────────────────────────────────

  const endRoom = useCallback(async (recordingUrl: string | null): Promise<void> => {
    if (!room?.roomId || !room.startedAt) return;
    setError(null);
    try {
      await roomService.endRoom(room.roomId, room.startedAt, recordingUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to end room.";
      setError(message);
    }
  }, [room]);

  // ─── Subscribe ───────────────────────────────────────────────────────────

  const subscribeToRoom = useCallback((roomId: string) => {
    // Cancel any existing subscription before creating a new one.
    unsubscribeRef.current?.();

    unsubscribeRef.current = roomService.subscribeToRoom(
      roomId,
      (updatedRoom) => setRoom(updatedRoom),
      (err) => setError(err.message)
    );
  }, []);

  // Cleanup Firestore listener on unmount.
  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  return {
    room,
    isLoading,
    error,
    createRoom,
    joinRoom,
    endRoom,
    subscribeToRoom,
    clearError,
  };
};
