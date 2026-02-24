import { useState, useEffect, useCallback } from "react";
import { roomService } from "../services/room.service";
import { useAuth } from "../context/AuthContext";
import type { Room, InterviewStats } from "../types";

export interface DashboardSession {
  room: Room;
  stats: InterviewStats | null;
}

export const useDashboard = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await roomService.getUserInterviews(user.uid);
      setSessions(data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load interview history.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    isLoading,
    error,
    refresh: fetchSessions,
  };
};
