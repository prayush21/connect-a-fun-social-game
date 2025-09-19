import { useEffect, useCallback } from "react";
import { useStore } from "../store";

/**
 * Hook that monitors connection status and handles automatic reconnection
 */
export const useConnectionMonitor = () => {
  const isConnected = useStore((state) => state.isConnected);
  const connectionRetries = useStore((state) => state.connectionRetries);
  const roomId = useStore((state) => state.roomId);
  const reconnect = useStore((state) => state.reconnect);
  const lastSyncTime = useStore((state) => state.lastSyncTime);

  const MAX_RETRIES = 5;
  const RECONNECT_DELAY = 2000; // 2 seconds
  const SYNC_TIMEOUT = 30000; // 30 seconds

  const handleReconnect = useCallback(async () => {
    if (!roomId || connectionRetries >= MAX_RETRIES) return;

    try {
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY));
      await reconnect();
    } catch (error) {
      console.error("Reconnection failed:", error);
    }
  }, [roomId, connectionRetries, reconnect]);

  // Monitor connection status
  useEffect(() => {
    if (!roomId) return;

    const checkConnection = () => {
      const now = Date.now();
      const timeSinceLastSync = lastSyncTime ? now - lastSyncTime : 0;

      // If we haven't synced in a while, consider connection lost
      if (timeSinceLastSync > SYNC_TIMEOUT && isConnected) {
        console.warn("Connection seems stale, triggering reconnection");
        handleReconnect();
      }
    };

    const interval = setInterval(checkConnection, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [roomId, lastSyncTime, isConnected, handleReconnect]);

  // Auto-reconnect when connection is lost
  useEffect(() => {
    if (!isConnected && roomId && connectionRetries < MAX_RETRIES) {
      console.log(
        `Connection lost, attempting reconnection (${connectionRetries + 1}/${MAX_RETRIES})`
      );
      handleReconnect();
    }
  }, [isConnected, roomId, connectionRetries, handleReconnect]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (!isConnected && roomId) {
        console.log("Network back online, attempting reconnection");
        handleReconnect();
      }
    };

    const handleOffline = () => {
      console.log("Network offline detected");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isConnected, roomId, handleReconnect]);

  return {
    isConnected,
    connectionRetries,
    maxRetries: MAX_RETRIES,
    canReconnect: connectionRetries < MAX_RETRIES,
    manualReconnect: handleReconnect,
  };
};
