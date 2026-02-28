import React, { useEffect, useRef, useState } from "react";
import { Spinner } from "../../../components/ui/Spinner";
import InterviewSidebar from "./InterviewSidebar";
import type { UserRole, InterviewStats } from "../../../types";

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnecting: boolean;
  /** The current user's role — sidebar is only shown when "interviewer" */
  userRole?: UserRole;
  /** Live interview monitoring stats — passed from CallPage */
  interviewStats?: InterviewStats;
  /** Room ID for proctoring */
  roomId?: string;
  /** Processed stream with landmarks (from CallPage) */
  processedStream?: MediaStream | null;
}

interface VideoElementProps {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
  "aria-label"?: string;
}

const VideoElement: React.FC<VideoElementProps> = ({
  stream,
  muted = false,
  className = "",
  "aria-label": ariaLabel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
        style={{ transform: muted ? "scaleX(-1)" : "none" }} // Flip local video
        aria-label={ariaLabel}
      />
    </div>
  );
};

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  remoteStream,
  isConnecting,
  userRole,
  interviewStats,
  processedStream,
}) => {
  const [isLocalPinned, setIsLocalPinned] = useState(false);
  const [showDetection, setShowDetection] = useState(false);

  // Toggle between local and remote fullscreen
  const togglePin = () => {
    setIsLocalPinned((prev) => !prev);
  };

  // Determine which stream is fullscreen and which is PiP
  // For the remote stream, use the processed version if detection is ON and it's the interviewer
  const effectiveRemoteStream =
    showDetection && userRole === "interviewer"
      ? processedStream || remoteStream
      : remoteStream;

  const fullscreenStream = isLocalPinned ? localStream : effectiveRemoteStream;
  const pipStream = isLocalPinned ? effectiveRemoteStream : localStream;

  const isFullscreenLocal = isLocalPinned;
  const isPipLocal = !isLocalPinned;

  // Show placeholder only if no stream is available
  const hasAnyStream = localStream || remoteStream;
  const showPlaceholder = !hasAnyStream;

  // Show the sidebar only when the current user is an interviewer AND stats are available
  const showSidebar = userRole === "interviewer" && !!interviewStats;

  return (
    <div className="relative w-full h-full bg-gray-950 flex">
      {/* Main Video Area */}
      <div
        className={`relative ${showSidebar ? "flex-1" : "w-full"} bg-gray-950`}
      >
        {/* Detection Toggle - Only for interviewer */}
        {userRole === "interviewer" && remoteStream && (
          <div className="absolute top-6 left-6 z-30 flex flex-col gap-2">
            <button
              onClick={() => setShowDetection(!showDetection)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all backdrop-blur-md border ${
                showDetection
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 border-indigo-400"
                  : "bg-black/60 text-white hover:bg-black/80 border-white/20"
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  showDetection ? "bg-white animate-pulse" : "bg-white/40"
                }`}
              />
              {showDetection ? "Detection On" : "Show Detection"}
            </button>

            {showDetection && !processedStream && (
              <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2">
                <Spinner size="sm" />

                <span className="text-[10px] text-white/80 font-medium uppercase tracking-wider">
                  Initializing AI Models...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Fullscreen video */}
        {fullscreenStream ? (
          <div
            onClick={pipStream ? togglePin : undefined}
            className={`w-full h-full ${pipStream ? "cursor-pointer" : ""}`}
          >
            <VideoElement
              stream={fullscreenStream}
              className="w-full h-full"
              aria-label={
                isFullscreenLocal
                  ? "Your video (click to show remote fullscreen)"
                  : "Remote participant video (click to show your video fullscreen)"
              }
              muted={isFullscreenLocal}
            />
          </div>
        ) : showPlaceholder ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            {isConnecting ? (
              <>
                <Spinner size="lg" />
                <p className="text-white/60 text-sm font-medium animate-pulse">
                  Waiting for participant…
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-white/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <p className="text-white/40 text-sm">
                  Waiting for participant…
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* PiP overlay — consistent position and size, always visible if stream exists */}
        {pipStream && (
          <div
            onClick={togglePin}
            className={`absolute bottom-24 ${showSidebar ? "right-4" : "right-4"} w-36 h-24 sm:w-48 sm:h-32 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-900 cursor-pointer hover:border-white/40 transition-all z-10`}
            aria-label={
              isPipLocal
                ? "Your video (click to show fullscreen)"
                : "Remote participant video (click to show fullscreen)"
            }
            title={
              isPipLocal
                ? "Click to show your video fullscreen"
                : "Click to show remote video fullscreen"
            }
          >
            <VideoElement
              stream={pipStream}
              muted={isPipLocal}
              className="w-full h-full"
            />
          </div>
        )}
      </div>

      {/* Interview Sidebar - Only visible to interviewers */}
      {showSidebar && interviewStats && (
        <InterviewSidebar stats={interviewStats} />
      )}
    </div>
  );
};
