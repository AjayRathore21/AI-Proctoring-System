import { useEffect, useRef, useCallback, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { roomService } from "../services/room.service";
import {
  proctoringService,
  type ObjectDetection,
  type Landmark,
} from "../services/proctoring.service";
import type { EventSeverity } from "../types";

interface UseProctoringOptions {
  roomId: string;
  stream: MediaStream | null;
  enabled: boolean;
  /** Optional canvas to draw landmarks on */
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;

  /** Whether to draw landmarks on the canvas */
  showDrawing?: boolean;
  /** Whether to disable logging to Firebase (useful for visual-only detection) */
  disableLogging?: boolean;
  /** Candidate name for logging */
  candidateName?: string;
}

export const useProctoring = ({
  roomId,
  stream,
  enabled,
  canvasRef,
  showDrawing = false,
  disableLogging = false,
  candidateName = "Candidate",
}: UseProctoringOptions) => {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // State for "burned-in" landmarks stream (for recording)
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(
    null,
  );
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Timers and state refs
  const lastNoFaceTime = useRef<number | null>(null);
  const lastLookingAwayTime = useRef<number | null>(null);
  const lastMultipleFacesTime = useRef<number | null>(null);
  const engagementScore = useRef<number>(100);
  const lastEngagementUpdateTime = useRef<number>(0);

  // Cooldowns to avoid spamming logs
  const lastLogTime = useRef<Record<string, number>>({});
  const LOG_COOLDOWN = 10000; // 10 seconds between same type of logs

  const shouldLog = useCallback((type: string, now: number) => {
    const lastTime = lastLogTime.current[type] || 0;
    if (now - lastTime > LOG_COOLDOWN) {
      lastLogTime.current[type] = now;
      return true;
    }
    return false;
  }, []);

  const triggerEvent = useCallback(
    async (
      description: string,
      severity: EventSeverity,
      eventType: string,
      landmarks?: Landmark[][],
      objects?: ObjectDetection[],
    ) => {
      const rId = roomId?.trim();
      if (!videoRef.current || !rId) return;

      console.log(`[Proctoring] 🚀 Triggering event: ${eventType}`);

      try {
        // 1. Capture image immediately
        const dataUrl = proctoringService.captureScreenshot(
          videoRef.current,
          landmarks,
          objects,
        );

        // 2. Wrap upload in a timeout-aware function
        const uploadWithTimeout = async (): Promise<string> => {
          try {
            return await Promise.race([
              proctoringService.uploadScreenshot(rId, dataUrl),
              new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 5000),
              ),
            ]);
          } catch (e) {
            console.warn("[Proctoring] Screenshot upload skipped:", e);
            return "";
          }
        };

        // 3. Attempt upload, but don't let it hang the whole proctoring loop
        const screenshotUrl = await uploadWithTimeout();

        // 4. Log the text event immediately
        await roomService.addEventLog(rId, {
          timestamp: new Date().toLocaleTimeString(),
          description,
          severity,
          eventType,
          screenshotUrl,
        });

        console.log(`[Proctoring] ✅ Event logged: ${eventType}`);
      } catch (error) {
        console.error("[Proctoring] Failed to log event:", error);
      }
    },

    [roomId],
  );

  useEffect(() => {
    if (!enabled || !stream || !roomId) {
      return;
    }

    let isDisposed = false;

    const initProctoring = async () => {
      try {
        // 1. Initialize Face Landmarker
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 2,
        });

        if (isDisposed) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;

        // 2. Initialize Object Detection Model
        await proctoringService.loadObjectDetectionModel();
        if (isDisposed) return;

        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            video
              .play()
              .then(() => resolve())
              .catch(() => resolve());
          };
          // Fallback if metadata doesn't fire
          setTimeout(() => resolve(), 2000);
        });

        if (isDisposed) return;
        videoRef.current = video;

        // Initialize processing canvas
        const pCanvas = document.createElement("canvas");
        pCanvas.width = video.videoWidth || 640;
        pCanvas.height = video.videoHeight || 480;
        processingCanvasRef.current = pCanvas;

        // Capture stream from canvas
        const canvasStream = pCanvas.captureStream(30);

        // IMPORTANT: Merge original audio tracks so the stream isn't silent
        stream.getAudioTracks().forEach((track) => {
          canvasStream.addTrack(track.clone());
        });

        setProcessedStream(canvasStream);

        let lastObjectDetectionTime = 0;
        let currentObjects: ObjectDetection[] = [];

        const detect = async () => {
          if (isDisposed) return;

          if (
            !landmarkerRef.current ||
            !videoRef.current ||
            videoRef.current.paused ||
            videoRef.current.readyState < 2
          ) {
            requestRef.current = requestAnimationFrame(detect);
            return;
          }

          const now = Date.now();
          const startTimeMs = performance.now();

          // 1. Face Detection (Every frame)
          let faceResults: { faceLandmarks: Landmark[][] } | null = null;
          try {
            faceResults = landmarkerRef.current.detectForVideo(
              videoRef.current,
              startTimeMs,
            ) as unknown as { faceLandmarks: Landmark[][] };
          } catch {
            // ignore
          }

          // 2. Object Detection (Every 1000ms to save CPU - more relaxed)
          if (now - lastObjectDetectionTime > 1000) {
            try {
              currentObjects = await proctoringService.detectObjects(
                videoRef.current,
              );
              lastObjectDetectionTime = now;

              console.log("Current objects:", currentObjects);

              // Handle object detection events
              if (!disableLogging) {
                const detectedClasses = currentObjects.map((o) => o.class);

                if (
                  detectedClasses.includes("cell phone") &&
                  shouldLog("mobile_phone", now)
                ) {
                  console.log("Mobile phone detected");
                  triggerEvent(
                    "Mobile phone detected",
                    "alert",
                    "mobile_phone",
                    faceResults?.faceLandmarks as Landmark[][],
                    currentObjects,
                  );
                }

                if (
                  (detectedClasses.includes("book") ||
                    detectedClasses.includes("handbag")) &&
                  shouldLog("book_detected", now)
                ) {
                  triggerEvent(
                    "Book or notes detected",
                    "warning",
                    "book_detected",
                    faceResults?.faceLandmarks as Landmark[][],
                    currentObjects,
                  );
                }

                if (
                  detectedClasses.includes("watch") &&
                  shouldLog("smartwatch", now)
                ) {
                  triggerEvent(
                    "Smartwatch or unauthorized watch detected",
                    "warning",
                    "smartwatch",
                    faceResults?.faceLandmarks as Landmark[][],
                    currentObjects,
                  );
                }

                const electronicClasses = ["laptop", "tv", "monitor"];
                const hasElectronics = currentObjects.some((o) =>
                  electronicClasses.includes(o.class),
                );
                if (hasElectronics && shouldLog("electronic_device", now)) {
                  triggerEvent(
                    "Extra electronic device detected",
                    "alert",
                    "electronic_device",
                    faceResults?.faceLandmarks as Landmark[][],
                    currentObjects,
                  );
                }
              }
            } catch {
              // ignore
            }
          }

          // ─── Engagement Tracking ──────────────────────────────────────────

          if (!disableLogging && faceResults) {
            // Update engagement score every second (heuristic)
            let penalty = 0;
            if (faceResults.faceLandmarks.length === 0) penalty = 5;
            else if (faceResults.faceLandmarks.length > 1) penalty = 3;
            else {
              // Check looking away
              const landmarks = faceResults.faceLandmarks[0];
              const nose = landmarks[1];
              const leftEye = landmarks[33];
              const rightEye = landmarks[263];
              const ratio =
                Math.abs(nose.x - leftEye.x) / Math.abs(nose.x - rightEye.x);
              if (ratio < 0.4 || ratio > 2.5) penalty = 2;
            }

            // Item penalties
            if (currentObjects.some((o) => o.class === "cell phone"))
              penalty += 5;
            if (currentObjects.some((o) => o.class === "watch")) penalty += 2;

            if (penalty > 0) {
              // Penalty: 0.02 to 0.05 per frame -> ~1.2% to 3% per second
              engagementScore.current = Math.max(
                0,
                engagementScore.current - penalty / 100,
              );
            } else {
              // Recovery: 0.01 per frame -> ~0.6% per second
              engagementScore.current = Math.min(
                100,
                engagementScore.current + 0.01,
              );
            }

            // Sync engagement level to Firestore every 5 seconds
            if (now - lastEngagementUpdateTime.current > 5000) {
              roomService.updateInterviewStats(roomId, {
                candidateName,
                engagementLevel: Math.round(engagementScore.current),
              });
              lastEngagementUpdateTime.current = now;
            }
          }

          // ─── Drawing ──────────────────────────────────────────────────────

          const drawDetections = (
            ctx: CanvasRenderingContext2D,
            width: number,
            height: number,
            isUi: boolean,
          ) => {
            // Clear or draw background
            if (isUi) {
              ctx.clearRect(0, 0, width, height);
            } else {
              // For processing canvas, always draw the video frame
              if (videoRef.current && videoRef.current.readyState >= 2) {
                ctx.drawImage(videoRef.current, 0, 0, width, height);
              }
            }

            // Draw Face Landmarks
            if (faceResults && faceResults.faceLandmarks) {
              proctoringService.drawLandmarks(
                ctx,
                faceResults.faceLandmarks as Landmark[][],
                width,
                height,
              );
            }

            // Draw Object Detections
            if (currentObjects.length > 0) {
              proctoringService.drawObjects(ctx, currentObjects);
            }

            // Debug: indicate active detection
            if (!isUi) {
              ctx.fillStyle = "#00ff00";
              ctx.beginPath();
              ctx.arc(10, 10, 5, 0, Math.PI * 2);
              ctx.fill();
            }
          };

          // 1. UI Canvas (if user provided one via ref)
          if (showDrawing && canvasRef?.current && videoRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              if (
                canvas.width !== videoRef.current.videoWidth ||
                canvas.height !== videoRef.current.videoHeight
              ) {
                canvas.width = videoRef.current.videoWidth || 640;
                canvas.height = videoRef.current.videoHeight || 480;
              }
              drawDetections(ctx, canvas.width, canvas.height, true);
            }
          }

          // 2. Processing Canvas (Always updated for the stream we return)
          if (processingCanvasRef.current && videoRef.current) {
            const ctx = processingCanvasRef.current.getContext("2d");
            if (ctx) {
              const pW = processingCanvasRef.current.width;
              const pH = processingCanvasRef.current.height;
              // Sync resolution if video changed
              if (
                pW !== videoRef.current.videoWidth ||
                pH !== videoRef.current.videoHeight
              ) {
                if (videoRef.current.videoWidth > 0) {
                  processingCanvasRef.current.width =
                    videoRef.current.videoWidth;
                  processingCanvasRef.current.height =
                    videoRef.current.videoHeight;
                }
              }
              drawDetections(
                ctx,
                processingCanvasRef.current.width,
                processingCanvasRef.current.height,
                false,
              );
            }
          }

          // ─── Behavioral Analysis ──────────────────────────────────────────

          if (faceResults) {
            // 1. Detect No Face (> 10 sec)
            if (faceResults.faceLandmarks.length === 0) {
              if (!lastNoFaceTime.current) lastNoFaceTime.current = now;
              const duration = now - lastNoFaceTime.current;

              if (
                duration > 10000 &&
                shouldLog("no_face", now) &&
                !disableLogging
              ) {
                triggerEvent(
                  "No face detected",
                  "alert",
                  "no_face",
                  faceResults.faceLandmarks as Landmark[][],
                  currentObjects,
                );
              }
            } else {
              lastNoFaceTime.current = null;
            }

            // 2. Detect Multiple Faces
            if (faceResults.faceLandmarks.length > 1) {
              if (!lastMultipleFacesTime.current)
                lastMultipleFacesTime.current = now;
              if (shouldLog("multiple_faces", now) && !disableLogging) {
                triggerEvent(
                  `${faceResults.faceLandmarks.length} faces detected`,
                  "alert",
                  "multiple_faces",
                  faceResults.faceLandmarks as Landmark[][],
                  currentObjects,
                );
              }
            } else {
              lastMultipleFacesTime.current = null;
            }

            // 3. Detect Not Looking at Screen (> 5 sec)
            if (faceResults.faceLandmarks.length === 1) {
              const landmarks = faceResults.faceLandmarks[0];
              const nose = landmarks[1];
              const leftEye = landmarks[33];
              const rightEye = landmarks[263];

              const leftDist = Math.abs(nose.x - leftEye.x);
              const rightDist = Math.abs(nose.x - rightEye.x);
              const ratio = leftDist / rightDist;

              const isLookingAway = ratio < 0.4 || ratio > 2.5;

              if (isLookingAway) {
                if (!lastLookingAwayTime.current)
                  lastLookingAwayTime.current = now;
                const duration = now - lastLookingAwayTime.current;
                if (
                  duration > 5000 &&
                  shouldLog("looking_away", now) &&
                  !disableLogging
                ) {
                  triggerEvent(
                    "User not looking at screen",
                    "warning",
                    "looking_away",
                    faceResults.faceLandmarks as Landmark[][],
                    currentObjects,
                  );
                }
              } else {
                lastLookingAwayTime.current = null;
              }
            } else {
              lastLookingAwayTime.current = null;
            }
          }

          requestRef.current = requestAnimationFrame(detect);
        };

        requestRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.error("Proctoring initialization failed:", err);
      }
    };

    initProctoring();

    return () => {
      isDisposed = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }

      // IMPORTANT: Stop the processed stream tracks (the clones)
      if (processingCanvasRef.current) {
        // captureStream is not always on the base type in some TS versions
        const canvas = processingCanvasRef.current as HTMLCanvasElement & {
          captureStream?: () => MediaStream;
        };
        const stream = canvas.captureStream?.();
        stream?.getTracks().forEach((t) => t.stop());
      }
      setProcessedStream(null);
    };
  }, [
    enabled,
    stream,
    roomId,
    shouldLog,
    triggerEvent,
    showDrawing,
    canvasRef,
    disableLogging,
    candidateName,
  ]);

  return {
    processedStream,
  };
};
