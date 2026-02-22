/**
 * VideoGrid — purely presentational component.
 *
 * Layout:
 *  - Remote video fills the full screen (cover mode).
 *  - Local video is a small PiP overlay in the bottom-right corner.
 *  - Placeholder shown when streams are not yet available.
 */

import React, { useEffect, useRef } from "react";
import { Spinner } from "../../../components/ui/Spinner";

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnecting: boolean;
  remoteUserName?: string;
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
}) => (
  <div className="relative w-full h-full bg-gray-950">
    {/* Remote video — full canvas */}
    {remoteStream ? (
      <VideoElement
        stream={remoteStream}
        className="w-full h-full object-cover"
        aria-label="Remote participant video"
      />
    ) : (
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
              <svg className="w-10 h-10 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">Waiting for participant…</p>
          </div>
        )}
      </div>
    )}

    {/* Local video — PiP overlay */}
    <div
      className="absolute bottom-24 right-4 w-36 h-24 sm:w-48 sm:h-32 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-900"
      aria-label="Your video preview"
    >
      {localStream ? (
        <VideoElement
          stream={localStream}
          muted
          className="w-full h-full object-cover scale-x-[-1]" // Mirror local video
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      )}
    </div>
  </div>
);
