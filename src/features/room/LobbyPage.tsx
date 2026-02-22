/**
 * LobbyPage — entry point after authentication.
 *
 * Allows the user to:
 *  - Create a new room (becomes the caller)
 *  - Join an existing room by entering a room ID (becomes the callee)
 *
 * All room operations are delegated to useRoom.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useRoom } from "../../hooks/useRoom";
import { useAuthForm } from "../auth/hooks/useAuthForm";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createRoom, joinRoom, isLoading, error, clearError } = useRoom();
  const { logout } = useAuthForm();

  const [roomIdInput, setRoomIdInput] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    try {
      const roomId = await createRoom();
      setCreatedRoomId(roomId);
    } catch {
      // Error displayed via the error state from useRoom.
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomIdInput.trim();
    if (!trimmed) return;
    try {
      await joinRoom(trimmed);
      navigate(`/call/${trimmed}?role=callee`);
    } catch {
      // Error displayed via the error state from useRoom.
    }
  };

  const handleEnterCreatedRoom = () => {
    if (createdRoomId) {
      navigate(`/call/${createdRoomId}?role=caller`);
    }
  };

  const handleCopyRoomId = async () => {
    if (!createdRoomId) return;
    await navigator.clipboard.writeText(createdRoomId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 8h8a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V10a2 2 0 012-2z" />
            </svg>
          </div>
          <span className="font-semibold text-white">VideoCall</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50 hidden sm:block">
            {user?.displayName || user?.email}
          </span>
          <Button variant="ghost" onClick={logout} className="text-sm">
            Sign out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {error && <ErrorBanner message={error} onDismiss={clearError} />}

          {/* Create Room Card - Only for Interviewers */}
          {user?.role === "interviewer" && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-white mb-1">New Interview</h2>
              <p className="text-sm text-white/50 mb-4">
                Start a meeting and share the room ID with the interviewee.
              </p>

              {createdRoomId ? (
                <div className="space-y-3">
                  {/* Room ID display */}
                  <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5">
                    <span className="flex-1 font-mono text-sm text-white/90 truncate">
                      {createdRoomId}
                    </span>
                    <button
                      onClick={handleCopyRoomId}
                      className="text-xs text-blue-400 hover:text-blue-300 shrink-0 font-medium"
                    >
                      {isCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-white/40">
                    Share this ID with the interviewee so they can join.
                  </p>
                  <Button onClick={handleEnterCreatedRoom} className="w-full">
                    Enter Room
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleCreate}
                  isLoading={isLoading}
                  className="w-full"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Room
                </Button>
              )}
            </div>
          )}

          {/* Join Room Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-1">
              {user?.role === "interviewer" ? "Join a Call" : "Join Interview"}
            </h2>
            <p className="text-sm text-white/50 mb-4">
              {user?.role === "interviewer"
                ? "Enter the room ID you received from the meeting host."
                : "Enter the room ID you received from the interviewer."}
            </p>
            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <Input
                id="roomId"
                type="text"
                placeholder="Paste room ID here"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                required
              />
              <Button
                type="submit"
                variant="secondary"
                isLoading={isLoading}
              >
                Join Room
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};
