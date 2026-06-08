/**
 * local-bridge — types.ts
 * Internal types for the bridge server.
 */
import type { Job, JobResult, JobType, JobStatus } from "@remirdy/shared";
import type WebSocket from "ws";

export type { Job, JobResult, JobType, JobStatus };

export interface ConnectedPlugin {
  ws: WebSocket;
  pluginVersion: string;
  photoshopVersion: string;
  activeDocument: string | null;
  connectedAt: Date;
  lastSeen: Date;
  lastPongAt: Date;
}

export interface BridgeConfig {
  port: number;
  token: string;
  workspace: string;
  allowedAssetFolders: string[];
  allowDangerousBatchPlay: boolean;
}

// In-memory pending result resolvers (jobId → resolver)
export type PendingResolverMap = Map<
  string,
  {
    resolve: (result: JobResult) => void;
    reject: (err: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }
>;
