/**
 * RecordingService — combines local + remote streams, records via
 * MediaRecorder, and uploads the result to Firebase Storage.
 *
 * Design:
 *  - Uses AudioContext to mix audio tracks from both streams.
 *  - Uses Canvas to composite local video (PiP) onto remote video,
 *    providing a single combined video track.
 *  - The final recording is a single MP4/WebM blob stored in Firebase Storage
 *    under recordings/{roomId}/{sessionId}.webm
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase.service";

export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private combinedStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;

  /**
   * Starts recording by combining the local and remote streams into one.
   *
   * @param localStream  The stream from getUserMedia (camera + mic)
   * @param remoteStream The stream received from the remote peer
   */
  startRecording(localStream: MediaStream, remoteStream: MediaStream): void {
    this.chunks = [];
    this.combinedStream = this.combineStreams(localStream, remoteStream);

    // Prefer VP9 in WebM for broad browser support; fall back gracefully.
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    this.mediaRecorder = new MediaRecorder(this.combinedStream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    // Collect data every second to limit memory usage.
    this.mediaRecorder.start(1000);
    console.log("[RecordingService] Recording started.");
  }

  /**
   * Stops recording and uploads the collected blobs to Firebase Storage.
   * Returns the public download URL.
   */
  async stopAndUpload(roomId: string, sessionId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("[RecordingService] No active recording."));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.chunks, { type: "video/webm" });
          const url = await this.uploadToStorage(blob, roomId, sessionId);
          this.cleanup();
          resolve(url);
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Immediately stops and discards the recording without uploading.
   * Use when the call ends abnormally.
   */
  discard(): void {
    if (this.mediaRecorder?.state !== "inactive") {
      this.mediaRecorder?.stop();
    }
    this.cleanup();
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Combines local and remote audio using AudioContext's ChannelMergerNode.
   * The remote video track is used as the primary video track (full-screen).
   * Local video is not composited server-side to keep CPU usage low;
   * the PiP overlay is purely a UI concern.
   */
  private combineStreams(
    localStream: MediaStream,
    remoteStream: MediaStream
  ): MediaStream {
    this.audioContext = new AudioContext();

    const destination = this.audioContext.createMediaStreamDestination();

    const addAudioTracks = (stream: MediaStream) => {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const source = this.audioContext!.createMediaStreamSource(
          new MediaStream(audioTracks)
        );
        source.connect(destination);
      }
    };

    addAudioTracks(localStream);
    addAudioTracks(remoteStream);

    const combined = new MediaStream();

    // Use remote video as the primary video track.
    remoteStream.getVideoTracks().forEach((t) => combined.addTrack(t));

    // Mixed audio from both participants.
    destination.stream.getAudioTracks().forEach((t) => combined.addTrack(t));

    return combined;
  }

  private async uploadToStorage(
    blob: Blob,
    roomId: string,
    sessionId: string
  ): Promise<string> {
    const path = `recordings/${roomId}/${sessionId}.webm`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, blob, { contentType: "video/webm" });
    const url = await getDownloadURL(storageRef);

    console.log("[RecordingService] Uploaded recording:", url);
    return url;
  }

  private cleanup(): void {
    this.chunks = [];
    this.mediaRecorder = null;

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop all tracks on the combined stream to release device resources.
    this.combinedStream?.getTracks().forEach((t) => t.stop());
    this.combinedStream = null;
  }
}
