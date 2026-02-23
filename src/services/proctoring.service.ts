import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase.service";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export interface ObjectDetection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  score: number;
}

export const proctoringService = {
  privateModel: null as cocoSsd.ObjectDetection | null,

  async loadObjectDetectionModel() {
    if (this.privateModel) return this.privateModel;
    this.privateModel = await cocoSsd.load();
    return this.privateModel;
  },

  async detectObjects(video: HTMLVideoElement): Promise<ObjectDetection[]> {
    const model = await this.loadObjectDetectionModel();
    return await model.detect(video);
  },

  /**
   * Captures a screenshot from a video element and returns a data URL.
   * Now includes drawing landmarks and object detections if provided.
   */
  captureScreenshot(
    video: HTMLVideoElement,
    landmarks?: Landmark[][],
    objects?: ObjectDetection[],
  ): string {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Draw the current frame
    ctx.drawImage(video, 0, 0);

    // Draw landmarks if provided
    if (landmarks && landmarks.length > 0) {
      this.drawLandmarks(ctx, landmarks, video.videoWidth, video.videoHeight);
    }

    // Draw objects if provided
    if (objects && objects.length > 0) {
      this.drawObjects(ctx, objects);
    }

    return canvas.toDataURL("image/webp", 0.7);
  },

  /**
   * Draws detection landmarks on a canvas context.
   */
  drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[][],
    width: number,
    height: number,
  ): void {
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#00ff00";

    landmarks.forEach((face) => {
      let minX = width,
        minY = height,
        maxX = 0,
        maxY = 0;

      face.forEach((pt: Landmark) => {
        const x = pt.x * width;
        const y = pt.y * height;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);

        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2 * Math.PI);
        ctx.fill();
      });

      const padding = 20;
      ctx.strokeRect(
        minX - padding,
        minY - padding,
        maxX - minX + padding * 2,
        maxY - minY + padding * 2,
      );

      ctx.font = "16px Inter, sans-serif";
      ctx.fillText("Face Detected", minX - padding, minY - padding - 5);
    });
  },

  /**
   * Draws object detections on a canvas context.
   */
  drawObjects(ctx: CanvasRenderingContext2D, objects: ObjectDetection[]): void {
    ctx.lineWidth = 2;
    ctx.font = "16px Inter, sans-serif";

    objects.forEach((obj) => {
      const [x, y, width, height] = obj.bbox;

      // Different colors for different objects
      if (obj.class === "cell phone") {
        ctx.strokeStyle = "#ff4757"; // Red
        ctx.fillStyle = "#ff4757";
      } else if (obj.class === "book") {
        ctx.strokeStyle = "#ffa502"; // Orange
        ctx.fillStyle = "#ffa502";
      } else {
        ctx.strokeStyle = "#2f3542"; // Dark blue/gray
        ctx.fillStyle = "#2f3542";
      }

      ctx.strokeRect(x, y, width, height);
      ctx.fillText(
        `${obj.class} (${Math.round(obj.score * 100)}%)`,
        x,
        y > 20 ? y - 5 : y + 20,
      );
    });
  },

  /**
   * Uploads a screenshot data URL to Firebase Storage.
   */
  async uploadScreenshot(roomId: string, dataUrl: string): Promise<string> {
    const filename = `proctoring/${roomId}/${Date.now()}.webp`;
    const storageRef = ref(storage, filename);
    await uploadString(storageRef, dataUrl, "data_url");
    return await getDownloadURL(storageRef);
  },
};
