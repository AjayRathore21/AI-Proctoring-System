/**
 * CallControls — the control bar at the bottom of the call screen.
 *
 * Fully presentational — receives state as props and fires callbacks.
 * Includes: mic toggle, camera toggle, end call, duration timer.
 */

import React from "react";
import { Button } from "../../../components/ui/Button";

interface CallControlsProps {
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  durationSeconds: number;
  isRecording: boolean;
  isUploading: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
}

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// Icon components (inline SVGs to avoid external icon library dependency)
const MicOnIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
  </svg>
);

const MicOffIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
  </svg>
);

const CameraOnIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 8h8a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V10a2 2 0 012-2z" />
  </svg>
);

const CameraOffIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8.118l14 7.764M3 16l14-7.882M3 8.118L3 16" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
  </svg>
);

export const CallControls: React.FC<CallControlsProps> = ({
  isMicEnabled,
  isCameraEnabled,
  durationSeconds,
  isRecording,
  isUploading,
  onToggleMic,
  onToggleCamera,
  onEndCall,
}) => (
  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 pb-6 pt-4
    bg-gradient-to-t from-black/80 to-transparent">
    {/* Duration + Recording Indicator */}
    <div className="absolute left-4 bottom-8 flex items-center gap-2">
      <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
        <span className="text-white text-sm font-mono">
          {formatDuration(durationSeconds)}
        </span>
        {isRecording && (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            REC
          </span>
        )}
        {isUploading && (
          <span className="text-xs text-yellow-400">Uploading…</span>
        )}
      </div>
    </div>

    {/* Mic Toggle */}
    <Button
      variant="icon"
      onClick={onToggleMic}
      className={isMicEnabled
        ? "bg-white/20 hover:bg-white/30 text-white"
        : "bg-red-600/80 hover:bg-red-600 text-white"
      }
      aria-label={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
      title={isMicEnabled ? "Mute" : "Unmute"}
    >
      {isMicEnabled ? <MicOnIcon /> : <MicOffIcon />}
    </Button>

    {/* Camera Toggle */}
    <Button
      variant="icon"
      onClick={onToggleCamera}
      className={isCameraEnabled
        ? "bg-white/20 hover:bg-white/30 text-white"
        : "bg-red-600/80 hover:bg-red-600 text-white"
      }
      aria-label={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
      title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
    >
      {isCameraEnabled ? <CameraOnIcon /> : <CameraOffIcon />}
    </Button>

    {/* End Call */}
    <Button
      variant="icon"
      onClick={onEndCall}
      className="bg-red-600 hover:bg-red-700 text-white w-14 h-14"
      aria-label="End call"
      title="End call"
    >
      <PhoneIcon />
    </Button>
  </div>
);
