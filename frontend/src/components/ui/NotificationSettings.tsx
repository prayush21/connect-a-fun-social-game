"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { getNotificationCapabilities } from "@/lib/notifications";
import { Button } from "./button";
import { Label } from "./label";

interface NotificationSettingsProps {
  onClose?: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  onClose,
}) => {
  const {
    notificationPreferences,
    updateNotificationPreferences,
    initializeNotifications,
  } = useStore();

  const capabilities = getNotificationCapabilities();

  const handleToggleAudio = () => {
    updateNotificationPreferences({
      audioEnabled: !notificationPreferences.audioEnabled,
    });
  };

  const handleToggleVibration = () => {
    updateNotificationPreferences({
      vibrationEnabled: !notificationPreferences.vibrationEnabled,
    });
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(event.target.value);
    updateNotificationPreferences({ volume });
  };

  const handleTestNotification = async () => {
    try {
      // Initialize notifications if not already done
      if (!capabilities.audioReady) {
        initializeNotifications();
      }

      // Import the notify function dynamically to avoid circular dependency
      const { notify } = await import("@/lib/notifications");
      await notify("new_reference");
    } catch (error) {
      console.error("Failed to test notification:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notification Settings</h3>

        {/* Audio Notifications */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="audio-enabled">Audio Notifications</Label>
            <button
              id="audio-enabled"
              type="button"
              onClick={handleToggleAudio}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationPreferences.audioEnabled
                  ? "bg-indigo-600"
                  : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationPreferences.audioEnabled
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Volume Control */}
          {notificationPreferences.audioEnabled && (
            <div className="space-y-2">
              <Label htmlFor="volume">
                Volume: {Math.round(notificationPreferences.volume * 100)}%
              </Label>
              <input
                id="volume"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={notificationPreferences.volume}
                onChange={handleVolumeChange}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
              />
            </div>
          )}
        </div>

        {/* Vibration Notifications */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="vibration-enabled">Vibration Notifications</Label>
              {!capabilities.vibrationSupported && (
                <p className="text-sm text-gray-500">
                  Not supported on this device
                </p>
              )}
            </div>
            <button
              id="vibration-enabled"
              type="button"
              onClick={handleToggleVibration}
              disabled={!capabilities.vibrationSupported}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationPreferences.vibrationEnabled &&
                capabilities.vibrationSupported
                  ? "bg-indigo-600"
                  : "bg-gray-200"
              } ${
                !capabilities.vibrationSupported
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationPreferences.vibrationEnabled &&
                  capabilities.vibrationSupported
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Device Capabilities Info */}
        <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          <p className="font-medium">Device Capabilities:</p>
          <p>
            Audio:{" "}
            {capabilities.audioReady ? "✅ Ready" : "⚠️ Needs user interaction"}
          </p>
          <p>
            Vibration:{" "}
            {capabilities.vibrationSupported
              ? "✅ Supported"
              : "❌ Not supported"}
          </p>
        </div>

        {/* Test Button */}
        <div className="space-y-2">
          <Button
            onClick={handleTestNotification}
            variant="outline"
            className="w-full"
          >
            🔔 Test Notification
          </Button>
          {!capabilities.audioReady && (
            <p className="text-center text-sm text-gray-600">
              Click &quot;Test Notification&quot; to enable audio notifications
            </p>
          )}
        </div>
      </div>

      {onClose && (
        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      )}
    </div>
  );
};
