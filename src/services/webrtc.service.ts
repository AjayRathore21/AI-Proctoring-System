/**
 * WebRTCService — encapsulates the entire RTCPeerConnection lifecycle.
 *
 * Design decisions:
 *  - Class-based so that a single call has a single stateful instance.
 *  - Firestore acts as the signaling channel (offer/answer/ICE candidates).
 *  - ICE candidates are stored in subcollections to avoid document size limits.
 *  - The service is completely decoupled from React — it knows nothing about
 *    components, hooks, or context. This enables isolated testing.
 *
 * Firestore paths:
 *   /rooms/{roomId}/signal/data        → offer + answer
 *   /rooms/{roomId}/signal/data/callerCandidates/{id}
 *   /rooms/{roomId}/signal/data/calleeCandidates/{id}
 */

import {
  doc,
  collection,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { db } from "./firebase.service";
import type { IceCandidate } from "../types";

// Public STUN servers — in production you would add TURN servers
// to handle symmetric NAT traversal.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const SIGNAL_DOC_PATH = (roomId: string) =>
  doc(db, "rooms", roomId, "signal", "data");

const CALLER_CANDIDATES_PATH = (roomId: string) =>
  collection(db, "rooms", roomId, "signal", "data", "callerCandidates");

const CALLEE_CANDIDATES_PATH = (roomId: string) =>
  collection(db, "rooms", roomId, "signal", "data", "calleeCandidates");

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private roomId: string;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  // ─── Peer Connection ───────────────────────────────────────────────────────

  /**
   * Initialises a new RTCPeerConnection with a callback for when the
   * remote track arrives. Called once at the start of each call side.
   */
  createPeerConnection(
    onRemoteTrack: (stream: MediaStream) => void,
  ): RTCPeerConnection {
    if (this.pc) {
      console.warn("[WebRTCService] PeerConnection already exists. Reusing.");
      return this.pc;
    }

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const remoteStream = new MediaStream();

    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      onRemoteTrack(remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      console.log(
        "[WebRTCService] Connection state:",
        this.pc?.connectionState,
      );
    };

    this.pc.onicegatheringstatechange = () => {
      console.log(
        "[WebRTCService] ICE gathering state:",
        this.pc?.iceGatheringState,
      );
    };

    return this.pc;
  }

  /**
   * Adds all tracks from the local stream to the peer connection.
   * Must be called before createOffer/createAnswer so that m-lines are
   * negotiated correctly.
   */
  addTracks(localStream: MediaStream): void {
    if (!this.pc)
      throw new Error(
        "[WebRTCService] No PeerConnection. Call createPeerConnection first.",
      );
    localStream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, localStream);
    });
  }

  // ─── Caller Flow ──────────────────────────────────────────────────────────

  /**
   * Creates an SDP offer, sets it as the local description, writes it to
   * Firestore, and begins collecting ICE candidates for the caller side.
   */
  async createOffer(): Promise<void> {
    if (!this.pc) throw new Error("[WebRTCService] No PeerConnection.");

    // Collect ICE candidates and push them to Firestore as they arrive.
    this.pc.onicecandidate = async ({ candidate }) => {
      if (!candidate) return;
      const payload: IceCandidate = {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      };
      await addDoc(CALLER_CANDIDATES_PATH(this.roomId), payload);
    };

    const offer = await this.pc.createOffer();
    if (!this.pc) return;
    await this.pc.setLocalDescription(offer);

    await setDoc(SIGNAL_DOC_PATH(this.roomId), {
      offer: { type: offer.type, sdp: offer.sdp },
      answer: null,
    });

    // Listen for the answer once the callee sets it.
    const unsub = onSnapshot(SIGNAL_DOC_PATH(this.roomId), async (snap) => {
      if (!snap.exists() || !this.pc) return;
      const data = snap.data();
      if (data?.answer && !this.pc.currentRemoteDescription) {
        await this.pc.setRemoteDescription(
          new RTCSessionDescription(data.answer),
        );
      }
    });
    this.unsubscribers.push(unsub);

    // Listen for callee ICE candidates.
    const candidatesUnsub = onSnapshot(
      CALLEE_CANDIDATES_PATH(this.roomId),
      (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const data = change.doc.data() as IceCandidate;
            await this.pc!.addIceCandidate(
              new RTCIceCandidate({
                candidate: data.candidate,
                sdpMid: data.sdpMid,
                sdpMLineIndex: data.sdpMLineIndex,
              }),
            );
          }
        });
      },
    );
    this.unsubscribers.push(candidatesUnsub);
  }

  /**
   * Reads the offer from Firestore, creates an SDP answer, writes it back,
   * and begins collecting ICE candidates for the callee side.
   *
   * PRODUCTION READY: If the offer doesn't exist yet, it sets up a listener
   * and waits for it, enabling late-join support.
   */
  async createAnswer(): Promise<void> {
    if (!this.pc) throw new Error("[WebRTCService] No PeerConnection.");

    const setupAnswer = async (offer: RTCSessionDescriptionInit) => {
      if (!this.pc) return;

      // Collect callee ICE candidates and push to Firestore.
      this.pc.onicecandidate = async ({ candidate }) => {
        if (!candidate) return;
        const payload: IceCandidate = {
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        };
        await addDoc(CALLEE_CANDIDATES_PATH(this.roomId), payload);
      };

      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await this.pc.createAnswer();
      if (!this.pc) return;
      await this.pc.setLocalDescription(answer);

      await updateDoc(SIGNAL_DOC_PATH(this.roomId), {
        answer: { type: answer.type, sdp: answer.sdp },
      });

      // Listen for caller ICE candidates.
      const candidatesUnsub = onSnapshot(
        CALLER_CANDIDATES_PATH(this.roomId),
        (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const data = change.doc.data() as IceCandidate;
              try {
                await this.pc?.addIceCandidate(
                  new RTCIceCandidate({
                    candidate: data.candidate,
                    sdpMid: data.sdpMid,
                    sdpMLineIndex: data.sdpMLineIndex,
                  }),
                );
              } catch (e) {
                console.warn("[WebRTCService] Failed to add ICE candidate", e);
              }
            }
          });
        },
      );
      this.unsubscribers.push(candidatesUnsub);
    };

    // 1. Initial check for existing offer
    const signalSnap = await getDoc(SIGNAL_DOC_PATH(this.roomId));
    if (signalSnap.exists() && signalSnap.data()?.offer) {
      await setupAnswer(signalSnap.data()!.offer);
      return;
    }

    // 2. Wait for offer if not present (Late Join Support)
    console.log("[WebRTCService] Waiting for offer from caller...");
    return new Promise((resolve, reject) => {
      const unsub = onSnapshot(
        SIGNAL_DOC_PATH(this.roomId),
        async (snap) => {
          if (!snap.exists() || !this.pc) return;
          const data = snap.data();
          if (data?.offer) {
            unsub(); // Self-unsubscribe once offer is found
            try {
              await setupAnswer(data.offer);
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        },
        (err) => {
          unsub();
          reject(err);
        },
      );
      this.unsubscribers.push(unsub);
    });
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  /**
   * Closes the peer connection and removes all Firestore listeners.
   * Always call this when the call ends or the component unmounts.
   */
  closeConnection(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.onicegatheringstatechange = null;
      this.pc.close();
      this.pc = null;
    }
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  getPeerConnection(): RTCPeerConnection | null {
    return this.pc;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState ?? null;
  }

  async getNetworkStats(): Promise<{
    packetsLost: number;
    jitter: number;
    roundTripTime: number;
    bitrateKbps: number;
  } | null> {
    if (!this.pc) return null;

    try {
      const stats = await this.pc.getStats();
      let packetsLost = 0;
      let jitter = 0;
      let roundTripTime = 0;
      let bitrateKbps = 0;

      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          packetsLost = report.packetsLost || 0;
          jitter = report.jitter || 0;
        }
        if (
          report.type === "remote-candidate-pair" &&
          report.state === "succeeded"
        ) {
          roundTripTime = report.currentRoundTripTime || 0;
        }
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          bitrateKbps = Math.round((report.bytesReceived * 8) / 1000 / 60); // Simplified average
        }
      });

      return {
        packetsLost,
        jitter: parseFloat(jitter.toFixed(4)),
        roundTripTime: parseFloat(roundTripTime.toFixed(4)),
        bitrateKbps,
      };
    } catch (err) {
      console.error("[WebRTCService] Error getting stats:", err);
      return null;
    }
  }
}
