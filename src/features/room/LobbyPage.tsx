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
import { SessionHistory } from "./components/SessionHistory";
import { Plus, LogIn } from "lucide-react";

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
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 8h8a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V10a2 2 0 012-2z"
              />
            </svg>
          </div>
          <span className="font-semibold text-white">ProctoHire</span>
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
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-12">
          {error && <ErrorBanner message={error} onDismiss={clearError} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Room Card - Only for Interviewers */}
            {user?.role === "interviewer" && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Plus className="w-32 h-32 text-blue-400" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Plus className="w-6 h-6 text-blue-400" />
                  New Interview
                </h2>
                <p className="text-white/50 mb-8 max-w-sm">
                  Initialize a secure proctored session and invite your
                  candidate.
                </p>

                {createdRoomId ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col gap-2 bg-white/5 rounded-2xl p-4 border border-white/10">
                      <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">
                        Your Room ID
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="flex-1 font-mono text-lg text-blue-400 truncate">
                          {createdRoomId}
                        </span>
                        <button
                          onClick={handleCopyRoomId}
                          className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-bold transition-colors border border-blue-500/20"
                        >
                          {isCopied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <Button
                      onClick={handleEnterCreatedRoom}
                      className="w-full py-6 text-lg rounded-2xl"
                    >
                      Start Interview
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleCreate}
                    isLoading={isLoading}
                    className="w-full py-6 text-lg rounded-2xl shadow-lg shadow-blue-600/20 group"
                  >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    Create Room
                  </Button>
                )}
              </div>
            )}

            {/* Join Room Card */}
            <div
              className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group ${user?.role !== "interviewer" ? "lg:col-span-2" : ""}`}
            >
              <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <LogIn className="w-32 h-32 text-blue-400" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <LogIn className="w-6 h-6 text-blue-400" />
                {user?.role === "interviewer"
                  ? "Join a Call"
                  : "Join Interview"}
              </h2>
              <p className="text-white/50 mb-8 max-w-sm">
                Enter the session ID provided by your coordinator to begin.
              </p>

              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <Input
                  id="roomId"
                  type="text"
                  placeholder="Paste room ID here"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  className="bg-white/5 border-white/10 py-6 text-lg rounded-2xl focus:ring-blue-500/50"
                  required
                />
                <Button
                  type="submit"
                  variant="secondary"
                  isLoading={isLoading}
                  className="w-full py-6 text-lg rounded-2xl border border-white/10"
                >
                  Join Room
                </Button>
              </form>
            </div>
          </div>

          {/* History Section */}
          <div className="pt-8 border-t border-white/5">
            <SessionHistory />
          </div>
        </div>
      </main>
    </div>
  );
};
