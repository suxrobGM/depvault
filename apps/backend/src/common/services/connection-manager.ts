import { logger } from "@/common/utils/logger";

export interface WsHandle {
  send: (data: string) => void;
}

/**
 * Generic WebSocket connection manager.
 * Tracks userId → Set<WsHandle> and provides send/broadcast helpers.
 *
 * Each WebSocket endpoint (messages, videocalls, etc.) should create
 * its own instance so connection pools stay isolated.
 *
 * @example
 *   const manager = new ConnectionManager("messages");
 *   manager.add(userId, { send: ws.send.bind(ws) });
 *   manager.sendToUser(recipientId, { type: "new_message", message });
 */
export class ConnectionManager {
  private readonly connections = new Map<string, Set<WsHandle>>();

  constructor(private readonly namespace: string) {}

  /** Number of distinct connected users. */
  get userCount(): number {
    return this.connections.size;
  }

  /**
   * Whether a user has at least one active connection.
   * @param userId - The ID of the user to check.
   * @returns True if the user has at least one active connection, false otherwise.
   */
  isOnline(userId: string): boolean {
    const set = this.connections.get(userId);
    return !!set && set.size > 0;
  }

  /**
   * Register a connection. Broadcasts presence if this is the user's first.
   * @param userId - The ID of the user to register.
   * @param handle - The WebSocket handle to register.
   */
  add(userId: string, handle: WsHandle): void {
    let set = this.connections.get(userId);
    const isNew = !set;
    if (!set) {
      set = new Set();
      this.connections.set(userId, set);
    }
    set.add(handle);

    if (isNew) {
      this.broadcast({ type: "presence", userId, status: "online" }, userId);
    }

    logger.debug({ userId, namespace: this.namespace }, "ws connected");
  }

  /**
   * Remove a connection. Broadcasts presence if the user has none left.
   * @param userId - The ID of the user to remove.
   * @param handle - The WebSocket handle to remove.
   */
  remove(userId: string, handle: WsHandle): void {
    const set = this.connections.get(userId);
    if (!set) return;

    set.delete(handle);
    if (set.size === 0) {
      this.connections.delete(userId);
      this.broadcast({ type: "presence", userId, status: "offline" }, userId);
    }

    logger.debug({ userId, namespace: this.namespace }, "ws disconnected");
  }

  /**
   * Send a JSON payload to all connections of a specific user.
   * @param userId - The ID of the user to send to.
   * @param payload - The JSON payload to send.
   */
  sendToUser(userId: string, payload: Record<string, unknown>): void {
    const set = this.connections.get(userId);
    if (!set) return;

    const data = JSON.stringify(payload);
    for (const handle of set) {
      this.safeSend(handle, data);
    }
  }

  /**
   * Send a JSON payload to every connected user, optionally excluding one.
   * @param payload - The JSON payload to send.
   * @param excludeUserId - The ID of the user to exclude from the broadcast.
   */
  broadcast(payload: Record<string, unknown>, excludeUserId?: string): void {
    const data = JSON.stringify(payload);
    for (const [uid, set] of this.connections) {
      if (uid === excludeUserId) {
        continue;
      }

      for (const handle of set) {
        this.safeSend(handle, data);
      }
    }
  }

  private safeSend(handle: WsHandle, data: string): void {
    try {
      handle.send(data);
    } catch {
      // Connection may have closed between check and send
    }
  }
}
