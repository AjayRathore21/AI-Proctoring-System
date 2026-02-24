/**
 * CallPage — the active call screen.
 *
 * Orchestration responsibilities:
 *  1. Reads role (caller/callee) and roomId from the URL.
 *  2. Subscribes to the room document for real-time status.
 *  3. Starts the WebRTC session once the room is active.
 *  4. Recording starts only on explicit button click (not auto).
 *  5. Ends the room in Firestore and navigates back to lobby on hang-up.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { useWebRTC } from "../../hooks/useWebRTC";
import { useRoom } from "../../hooks/useRoom";
import { useRecording } from "../../hooks/useRecording";
import { useAuth } from "../../context/AuthContext";
import { VideoGrid } from "./components/VideoGrid";
import { CallControls } from "./components/CallControls";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { Spinner } from "../../components/ui/Spinner";
import type { InterviewStats } from "../../types";
import { useProctoring } from "../../hooks/useProctoring";
import { roomService } from "../../services/room.service";
import { CallSummary } from "./components/CallSummary";

export const CallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const role = (searchParams.get("role") as "caller" | "callee") ?? "caller";

  const { room, subscribeToRoom, endRoom } = useRoom();
  const recording = useRecording();

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const callStartedRef = useRef(false);

  // Real-time interview monitoring stats
  const [activeStats, setActiveStats] = useState<InterviewStats | null>(null);
  const [isEndingLocally, setIsEndingLocally] = useState(false);

  const {
    localStream,
    callState,
    controls,
    toggleMic,
    toggleCamera,
    startCall,
    hangUp,
    getNetworkStats,
  } = useWebRTC({
    roomId: roomId || "",
    role,
    onRemoteStream: setRemoteStream,
  });

  // ─── Proctoring (Enabled for interviewee self-monitoring OR interviewer remote-monitoring) ──────────────────

  const { processedStream } = useProctoring({
    roomId: roomId || "",
    // If interviewee: process local stream (self). If interviewer: process remote stream (candidate).
    stream: user?.role === "interviewee" ? localStream : remoteStream,
    enabled: !!roomId && callState.status === "connected",
    disableLogging: user?.role === "interviewer", // Only log from interviewee side
    candidateName: user?.displayName || user?.email || "Candidate",
  });

  // ─── Subscribe to Interview Stats (Interviewer side) ────────────────────────

  useEffect(() => {
    if (roomId) {
      return roomService.subscribeToInterviewStats(roomId, (stats) => {
        if (stats) {
          setActiveStats(stats);
        }
      });
    }
  }, [roomId]);

  // ─── Subscribe to Room ────────────────────────────────────────────────────

  useEffect(() => {
    if (roomId) {
      subscribeToRoom(roomId);
    }
  }, [roomId, subscribeToRoom]);

  // ─── Start Call ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (callStartedRef.current) return;

    const shouldStart =
      localStream &&
      (role === "caller" || (role === "callee" && room?.status === "active"));

    if (shouldStart) {
      callStartedRef.current = true;
      startCall();
    }
  }, [localStream, role, room?.status, startCall]);

  // ─── Recording — manual start on button click ────────────────────────────

  const handleToggleRecording = useCallback(() => {
    if (recording.isRecording) return;
    if (localStream && remoteStream) {
      // If interviewer, we want the remote stream (interviewee) to have drawings in recording.
      // If interviewee, we want the local stream (self) to have drawings (though current service records remote).
      const videoStream =
        user?.role === "interviewer"
          ? processedStream || remoteStream
          : remoteStream;
      const audioStream = localStream; // localStream has our mic

      recording.startRecording(audioStream, videoStream);
    }
  }, [recording, localStream, remoteStream, processedStream, user?.role]);

  // ─── Handle End Call ──────────────────────────────────────────────────────

  const handleEndCall = async () => {
    if (!roomId) return;
    setIsEndingLocally(true);

    // Get network stats before closing the connection
    const netStats = await getNetworkStats();
    if (netStats) {
      await roomService.updateInterviewStats(roomId, {
        networkStats: netStats,
      });
    }

    hangUp();

    let recordingUrl: string | null = null;

    if (recording.isRecording && room?.sessionId) {
      recordingUrl = await recording.stopAndUpload(roomId, room.sessionId);
    }

    await endRoom(recordingUrl);
  };

  // ─── Guard: if room ended by remote side ──────────────────────────────────

  useEffect(() => {
    if (room?.status === "ended" && callState.status !== "ended") {
      hangUp();
    }
  }, [room?.status, callState.status, hangUp]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!user) return <Navigate to="/" replace />;

  if (room?.status === "ended" && activeStats) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center p-4">
        <CallSummary room={room} stats={activeStats} />
      </div>
    );
  }

  const canRecord =
    callState.status === "connected" && !!localStream && !!remoteStream;

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col">
      {/* Error Overlay */}
      {callState.error && (
        <div className="absolute top-4 left-4 right-4 z-50">
          <ErrorBanner message={callState.error} />
        </div>
      )}

      {/* Uploading Overlay */}
      {(recording.isUploading || isEndingLocally) && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-white/70 text-sm">
              {recording.isUploading ? "Saving recording…" : "Ending session…"}
            </p>
          </div>
        </div>
      )}
      {/* ... rest of the component remains the same ... */}

      {/* Video — flex-1 so controls stay below in flow */}
      <div className="flex-1 min-h-0 relative">
        <VideoGrid
          localStream={localStream}
          remoteStream={remoteStream}
          isConnecting={callState.status === "connecting"}
          userRole={user.role}
          roomId={roomId}
          processedStream={processedStream}
          interviewStats={
            user.role === "interviewer"
              ? activeStats || {
                  candidateName: "Interviewee",
                  engagementLevel: 100,
                  eventLog: [],
                  itemDetection: {
                    mobilePhone: 0,
                    notesBooks: 0,
                    extraElectronics: 0,
                    smartwatch: 0,
                  },
                }
              : undefined
          }
        />
      </div>

      {/* Controls in document flow so always visible (minimized or maximized) */}
      <div className="shrink-0 w-full bg-gradient-to-t from-black/90 to-transparent pt-4 pb-6">
        <CallControls
          isMicEnabled={controls.isMicEnabled}
          isCameraEnabled={controls.isCameraEnabled}
          durationSeconds={callState.durationSeconds}
          isRecording={recording.isRecording}
          isUploading={recording.isUploading}
          canRecord={canRecord}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onEndCall={handleEndCall}
          onToggleRecording={handleToggleRecording}
        />
      </div>

      {/* Recording Upload Error */}
      {recording.uploadError && (
        <div className="absolute bottom-24 left-4 right-4 z-50">
          <ErrorBanner
            message={`Recording upload failed: ${recording.uploadError}`}
          />
        </div>
      )}

      {/* roomId guard moved here to satisfy hook rules */}
      {!roomId && <Navigate to="/lobby" replace />}
    </div>
  );
};
