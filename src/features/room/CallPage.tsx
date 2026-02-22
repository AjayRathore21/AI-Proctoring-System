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

  if (!roomId) return <Navigate to="/lobby" replace />;

  const { room, subscribeToRoom, endRoom } = useRoom();
  const recording = useRecording();

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const callStartedRef = useRef(false);

  // Default interview stats - can be replaced with real-time data later
  const [interviewStats] = useState<InterviewStats>({
    candidateName: user?.role === "interviewer" && room?.joinedBy ? "Interviewee" : "Waiting...",
    engagementLevel: 98,
    eventLog: [
      {
        id: "1",
        timestamp: "10:36:01",
        description: "Mobile phone detected",
        severity: "normal",
        eventType: "mobile_phone",
      },
      {
        id: "2",
        timestamp: "10:36:15",
        description: "User looking away (5s)",
        severity: "warning",
        eventType: "looking_away",
      },
      {
        id: "3",
        timestamp: "10:37:05",
        description: "No face detected (10s)",
        severity: "alert",
        eventType: "no_face",
      },
      {
        id: "4",
        timestamp: "10:37:15",
        description: "Multiple faces detected",
        severity: "alert",
        eventType: "multiple_faces",
      },
      {
        id: "5",
        timestamp: "10:38:02",
        description: "Papers/notes detected",
        severity: "normal",
        eventType: "papers_notes",
      },
    ],
    itemDetection: {
      mobilePhone: 3,
      notesBooks: 1,
      extraElectronics: 0,
      smartwatch: 0,
    },
  });

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
      recording.startRecording(localStream, remoteStream);
    }
  }, [recording, localStream, remoteStream]);

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
      {recording.isUploading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-white/70 text-sm">Saving recording…</p>
          </div>
        </div>
      )}

      {/* Video — flex-1 so controls stay below in flow */}
      <div className="flex-1 min-h-0 relative">
        <VideoGrid
          localStream={localStream}
          remoteStream={remoteStream}
          isConnecting={callState.status === "connecting"}
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
          <ErrorBanner message={`Recording upload failed: ${recording.uploadError}`} />
        </div>
      )}
    </div>
  );
};
