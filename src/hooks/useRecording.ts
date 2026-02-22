/**
 * useRecording — manages the RecordingService lifecycle within React.
 *
 * Owns a single RecordingService instance (via useRef) and exposes
 * simple start/stop actions. The hook handles upload state and
 * ensures cleanup on unmount.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { RecordingService } from "../services/recording.service";

interface UseRecordingReturn {
  isRecording: boolean;
  isUploading: boolean;
  recordingUrl: string | null;
  uploadError: string | null;
  startRecording: (local: MediaStream, remote: MediaStream) => void;
  stopAndUpload: (roomId: string, sessionId: string) => Promise<string | null>;
}

export const useRecording = (): UseRecordingReturn => {
  const serviceRef = useRef<RecordingService>(new RecordingService());

  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const startRecording = useCallback(
    (local: MediaStream, remote: MediaStream) => {
      try {
        serviceRef.current.startRecording(local, remote);
        setIsRecording(true);
        setUploadError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Recording failed to start.";
        setUploadError(message);
      }
    },
    []
  );

  const stopAndUpload = useCallback(
    async (roomId: string, sessionId: string): Promise<string | null> => {
      if (!serviceRef.current.isRecording()) return null;

      setIsRecording(false);
      setIsUploading(true);
      setUploadError(null);

      try {
        const url = await serviceRef.current.stopAndUpload(roomId, sessionId);
        setRecordingUrl(url);
        return url;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        setUploadError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  // Discard if recording is still active when the component unmounts.
  useEffect(() => {
    const service = serviceRef.current;
    return () => {
      if (service.isRecording()) {
        service.discard();
      }
    };
  }, []);

  return {
    isRecording,
    isUploading,
    recordingUrl,
    uploadError,
    startRecording,
    stopAndUpload,
  };
};
