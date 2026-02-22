/**
 * useWebRTC — React hook that manages the WebRTCService instance lifecycle.
 *
 * Responsibilities:
 *  - Acquire camera/microphone via getUserMedia
 *  - Own the WebRTCService instance (stable across renders via useRef)
 *  - Expose stream refs, connection state, and media controls to components
 *  - Guarantee cleanup on unmount (stop tracks, close peer connection)
 *
 * The hook does NOT know whether the local user is caller or callee.
 * That distinction is resolved in the room feature and passed in via
 * the `role` parameter.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { WebRTCService } from "../services/webrtc.service";
import type { CallState, CallControls } from "../types";

type Role = "caller" | "callee";

interface UseWebRTCOptions {
  roomId: string;
  role: Role;
  onRemoteStream?: (stream: MediaStream) => void;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callState: CallState;
  controls: CallControls;
  toggleMic: () => void;
  toggleCamera: () => void;
  startCall: () => Promise<void>;
  hangUp: () => void;
}

export const useWebRTC = ({
  roomId,
  role,
  onRemoteStream,
}: UseWebRTCOptions): UseWebRTCReturn => {
  const serviceRef = useRef<WebRTCService | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callState, setCallState] = useState<CallState>({
    status: "idle",
    error: null,
    durationSeconds: 0,
  });
  const [controls, setControls] = useState<CallControls>({
    isMicEnabled: true,
    isCameraEnabled: true,
  });

  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Duration Timer ───────────────────────────────────────────────────────

  const startDurationTimer = useCallback(() => {
    durationTimerRef.current = setInterval(() => {
      setCallState((prev) => ({
        ...prev,
        durationSeconds: prev.durationSeconds + 1,
      }));
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  // ─── Remote Track Handler ─────────────────────────────────────────────────

  const handleRemoteStream = useCallback(
    (stream: MediaStream) => {
      setRemoteStream(stream);
      onRemoteStream?.(stream);
      setCallState((prev) => ({ ...prev, status: "connected" }));
      startDurationTimer();
    },
    [onRemoteStream, startDurationTimer]
  );

  // ─── Initialise Media ────────────────────────────────────────────────────
  // getUserMedia is only available in secure contexts (HTTPS or localhost).
  // On a phone via http://192.168.x.x:5173 it will be undefined — use HTTPS or a tunnel (e.g. ngrok).

  useEffect(() => {
    let stream: MediaStream | undefined;

    const initMedia = async () => {
      const gUM = navigator.mediaDevices?.getUserMedia;
      if (!gUM) {
        const isSecure = typeof window !== "undefined" && (window.isSecureContext ?? false);
        const message = !isSecure
          ? "Camera and microphone require a secure connection (HTTPS). Open this app via https:// or use a tunnel (e.g. ngrok) on your phone."
          : "This device or browser does not support camera/microphone access.";
        setCallState({ status: "error", error: message, durationSeconds: 0 });
        return;
      }
      try {
        stream = await gUM.call(navigator.mediaDevices, {
          video: true,
          audio: true,
        });
        setLocalStream(stream);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Camera/microphone access denied.";
        setCallState({ status: "error", error: message, durationSeconds: 0 });
      }
    };

    initMedia();

    return () => {
      stream?.getTracks()?.forEach((t) => t.stop());
    };
  }, []);

  // ─── Start Call ───────────────────────────────────────────────────────────

  const startCall = useCallback(async () => {
    if (!localStream) {
      setCallState((prev) => ({
        ...prev,
        status: "error",
        error: "Local stream not ready.",
      }));
      return;
    }

    setCallState((prev) => ({ ...prev, status: "connecting" }));

    try {
      const service = new WebRTCService(roomId);
      serviceRef.current = service;

      service.createPeerConnection(handleRemoteStream);
      service.addTracks(localStream);

      if (role === "caller") {
        await service.createOffer();
      } else {
        await service.createAnswer();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to establish call.";
      setCallState({ status: "error", error: message, durationSeconds: 0 });
    }
  }, [localStream, roomId, role, handleRemoteStream]);

  // ─── Hang Up ──────────────────────────────────────────────────────────────

  const hangUp = useCallback(() => {
    // Stop all local media tracks (camera and microphone)
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
      setLocalStream(null);
    }

    // Stop all remote media tracks
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
      setRemoteStream(null);
    }

    // Close WebRTC connection
    serviceRef.current?.closeConnection();
    serviceRef.current = null;
    stopDurationTimer();
    setCallState((prev) => ({ ...prev, status: "ended" }));
    
    // Reset controls state
    setControls({
      isMicEnabled: false,
      isCameraEnabled: false,
    });
  }, [localStream, remoteStream, stopDurationTimer]);

  // ─── Media Controls ───────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    setControls((prev) => ({ ...prev, isMicEnabled: audioTrack.enabled }));
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    videoTrack.enabled = !videoTrack.enabled;
    setControls((prev) => ({ ...prev, isCameraEnabled: videoTrack.enabled }));
  }, [localStream]);

  // ─── Cleanup on Unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      // Stop all local media tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      // Stop all remote media tracks
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      // Close WebRTC connection
      serviceRef.current?.closeConnection();
      stopDurationTimer();
    };
  }, [localStream, remoteStream, stopDurationTimer]);

  return {
    localStream,
    remoteStream,
    callState,
    controls,
    toggleMic,
    toggleCamera,
    startCall,
    hangUp,
  };
};
