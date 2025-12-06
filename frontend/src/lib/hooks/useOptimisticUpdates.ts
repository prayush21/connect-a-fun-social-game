import { useCallback, useEffect } from "react";
import { useStore } from "../store";

/**
 * Hook that provides utilities for managing optimistic updates
 */
export const useOptimisticUpdates = () => {
  const pendingActions = useStore((state) => state.pendingActions);
  const addPendingAction = useStore((state) => state.addPendingAction);
  const removePendingAction = useStore((state) => state.removePendingAction);
  const clearPendingActions = useStore((state) => state.clearPendingActions);
  const applyOptimisticUpdate = useStore(
    (state) => state.applyOptimisticUpdate
  );
  const clearOptimisticState = useStore((state) => state.clearOptimisticState);

  const PENDING_ACTION_TIMEOUT = 10000; // 10 seconds

  // Clean up stale pending actions
  useEffect(() => {
    const cleanupStaleActions = () => {
      const now = Date.now();
      const staleActions: string[] = [];

      pendingActions.forEach((action, id) => {
        if (now - action.timestamp > PENDING_ACTION_TIMEOUT) {
          staleActions.push(id);
        }
      });

      staleActions.forEach((id) => {
        console.warn(`Removing stale pending action: ${id}`);
        removePendingAction(id);
      });
    };

    const interval = setInterval(cleanupStaleActions, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [pendingActions, removePendingAction]);

  const withOptimisticUpdate = useCallback(
    async <T>(
      actionName: string,
      optimisticUpdate: () => void,
      serverAction: () => Promise<T>
    ): Promise<T> => {
      const actionId = `${actionName}_${Date.now()}`;

      try {
        // Add pending action and apply optimistic update
        addPendingAction(actionId, actionName, {});
        optimisticUpdate();

        // Execute server action
        const result = await serverAction();

        // Remove pending action after successful operation
        setTimeout(() => removePendingAction(actionId), 1000);

        return result;
      } catch (error) {
        // On error, remove pending action and clear optimistic state
        removePendingAction(actionId);
        clearOptimisticState();
        throw error;
      }
    },
    [addPendingAction, removePendingAction, clearOptimisticState]
  );

  const isPending = useCallback(
    (actionType: string): boolean => {
      return Array.from(pendingActions.values()).some(
        (action) => action.action === actionType
      );
    },
    [pendingActions]
  );

  const getPendingActionsCount = useCallback((): number => {
    return pendingActions.size;
  }, [pendingActions]);

  const getPendingActionsByType = useCallback(
    (actionType: string) => {
      return Array.from(pendingActions.entries())
        .filter(([, action]) => action.action === actionType)
        .map(([id, action]) => ({ id, ...action }));
    },
    [pendingActions]
  );

  return {
    pendingActions,
    withOptimisticUpdate,
    isPending,
    getPendingActionsCount,
    getPendingActionsByType,
    clearPendingActions,
    applyOptimisticUpdate,
    clearOptimisticState,
  };
};
