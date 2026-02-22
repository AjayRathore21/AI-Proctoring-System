/**
 * CallPage — the active call screen.
 *
 * Orchestration responsibilities:
 *  1. Reads role (caller/callee) and roomId from the URL.
 *  2. Subscribes to the room document for real-time status.
 *  3. Starts the WebRTC session once the room is active.
 *  4. Manages recording lifecycle (start on connection, stop on hang-up).
 *  5. Ends the room in Firestore and navigates back to lobby on hang-up.
 *
 * Components (VideoGrid, CallControls) remain purely presentational.
 * All async logic delegates to useWebRTC, useRoom, useRecording.
 */

import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { useWebRTC } from "../../hooks/useWebRTC";
import { useRoom } from "../../hooks/useRoom";
import { useRecording } from "../../hooks/useRecording";
import { useAuth } from "../../context/AuthContext";
import { VideoGrid } from "./components/VideoGrid";
import { CallControls } from "./components/CallControls";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { Spinner } from "../../components/ui/Spinner";

export const CallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = (searchParams.get("role") as "caller" | "callee") ?? "caller";

  // Guard: roomId must be present.
  if (!roomId) return <Navigate to="/lobby" replace />;

  const { room, subscribeToRoom, endRoom } = useRoom();
  const recording = useRecording();

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const callStartedRef = useRef(false);
  const recordingStartedRef = useRef(false);

  const {
    localStream,
    callState,
    controls,
    toggleMic,
    toggleCamera,
    startCall,
    hangUp,
  } = useWebRTC({
    roomId,
    role,
    onRemoteStream: setRemoteStream,
  });

  // ─── Subscribe to Room ────────────────────────────────────────────────────

  useEffect(() => {
    subscribeToRoom(roomId);
  }, [roomId, subscribeToRoom]);

  // ─── Start Call ───────────────────────────────────────────────────────────

  // Caller: start immediately after local media is ready.
  // Callee: start after the room transitions to "active" (creator is waiting).
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

  // ─── Auto-start Recording ─────────────────────────────────────────────────

  useEffect(() => {
    if (
      !recordingStartedRef.current &&
      callState.status === "connected" &&
      localStream &&
      remoteStream
    ) {
      recordingStartedRef.current = true;
      recording.startRecording(localStream, remoteStream);
    }
  }, [callState.status, localStream, remoteStream, recording]);

  // ─── Handle End Call ──────────────────────────────────────────────────────

  const handleEndCall = async () => {
    hangUp();

    let recordingUrl: string | null = null;

    if (recording.isRecording && room?.sessionId) {
      recordingUrl = await recording.stopAndUpload(roomId, room.sessionId);
    }

    await endRoom(recordingUrl);
    navigate("/lobby");
  };

  // ─── Guard: if room ended by remote side ──────────────────────────────────

  useEffect(() => {
    if (room?.status === "ended" && callState.status !== "ended") {
      hangUp();
      navigate("/lobby");
    }
  }, [room?.status, callState.status, hangUp, navigate]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col">
      {/* Error Overlay */}
      {callState.error && (
        <div className="absolute top-4 left-4 right-4 z-50">
          <ErrorBanner message={callState.error} />
        </div>
      )}

      {/* Connecting Overlay */}
      {callState.status === "connecting" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center
          bg-gray-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-white/70 text-sm">Establishing secure connection…</p>
          </div>
        </div>
      )}

      {/* Uploading Overlay */}
      {recording.isUploading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center
          bg-gray-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-white/70 text-sm">Saving recording…</p>
          </div>
        </div>
      )}

      {/* Video */}
      <div className="flex-1 relative">
        <VideoGrid
          localStream={localStream}
          remoteStream={remoteStream}
          isConnecting={callState.status === "connecting"}
        />

        {/* Controls overlay */}
        <CallControls
          isMicEnabled={controls.isMicEnabled}
          isCameraEnabled={controls.isCameraEnabled}
          durationSeconds={callState.durationSeconds}
          isRecording={recording.isRecording}
          isUploading={recording.isUploading}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onEndCall={handleEndCall}
        />
      </div>

      {/* Recording Upload Error */}
      {recording.uploadError && (
        <div className="absolute bottom-24 left-4 right-4 z-50">
          <ErrorBanner message={`Recording upload failed: ${recording.uploadError}`} />
        </div>
      )}
    </div>
  );
};
