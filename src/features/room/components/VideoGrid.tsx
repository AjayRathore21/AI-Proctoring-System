/**
 * VideoGrid — Google Meet-style video layout with toggleable fullscreen/PiP.
 *
 * Behavior:
 *  - Default: Remote video fullscreen, local video PiP (bottom-right).
 *  - Click local PiP → Local fullscreen, remote PiP (same position).
 *  - Click remote PiP → Remote fullscreen, local PiP (same position).
 *  - Click fullscreen video → Swap to the other stream (if PiP exists).
 *  - Layout and PiP size/position remain consistent when toggling.
 *  - Both streams always visible if available (one fullscreen, one PiP).
 */

import React, { useEffect, useRef, useState } from "react";
import { Spinner } from "../../../components/ui/Spinner";
import InterviewSidebar from "./InterviewSidebar";
import type { UserRole, InterviewStats } from "../../../types";

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnecting: boolean;
  remoteUserName?: string;
  /** The current user's role — sidebar is only shown when "interviewer" */
  userRole?: UserRole;
  /** Live interview monitoring stats — passed from CallPage */
  interviewStats?: InterviewStats;
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
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
      aria-label={ariaLabel}
    />
  );
};

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  remoteStream,
  isConnecting,
  remoteUserName,
  userRole,
  interviewStats,
}) => {
  const [isLocalPinned, setIsLocalPinned] = useState(false);

  // Toggle between local and remote fullscreen
  const togglePin = () => {
    setIsLocalPinned((prev) => !prev);
  };

  // Determine which stream is fullscreen and which is PiP
  const fullscreenStream = isLocalPinned ? localStream : remoteStream;
  const pipStream = isLocalPinned ? remoteStream : localStream;
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
        {/* Fullscreen video */}
        {fullscreenStream ? (
          <div
            onClick={pipStream ? togglePin : undefined}
            className={`w-full h-full ${pipStream ? "cursor-pointer" : ""}`}
          >
            <VideoElement
              stream={fullscreenStream}
              className="w-full h-full object-cover"
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
                <p className="text-white/60 text-sm">
                  {remoteUserName
                    ? `Waiting for ${remoteUserName} to connect…`
                    : "Connecting…"}
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
              className={`w-full h-full object-cover ${isPipLocal ? "scale-x-[-1]" : ""}`}
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
