"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { submitFeedback } from "@/lib/firebase/game";

const feedbackSchema = z.object({
  category: z.enum(["bug", "idea", "confusing"], {
    required_error: "Please select a category",
  }),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sessionId, roomId } = useStore();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      category: undefined,
      message: "",
    },
  });

  const watchMessage = form.watch("message");
  const messageLength = watchMessage?.length || 0;

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);
    try {
      // Submit feedback to Firestore
      const feedbackData = {
        category: data.category,
        message: data.message.trim(),
        createdAt: new Date(),
        userAgent: navigator.userAgent,
        gamePhase: getCurrentGamePhase(),
        roomId: roomId || null,
        userId: sessionId || null,
        sessionId: generateSessionId(),
      };

      // Submit feedback to Firestore
      await submitFeedback(feedbackData);

      // Show success and close
      onClose();
      form.reset();

      // Show success toast (you could implement a toast system)
      console.log("Feedback submitted successfully!");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentGamePhase = () => {
    if (!roomId) return "lobby-view";
    return "in-game"; // Could be more specific
  };

  const generateSessionId = () => {
    let sessionId = localStorage.getItem("connect_session_id");
    if (!sessionId) {
      sessionId =
        "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("connect_session_id", sessionId);
    }
    return sessionId;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Send Feedback</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Category */}
          <div>
            <Label
              htmlFor="category"
              className="text-sm font-medium text-slate-700"
            >
              Category *
            </Label>
            <select
              id="category"
              {...form.register("category")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a category...</option>
              <option value="bug">Bug</option>
              <option value="idea">Idea</option>
              <option value="confusing">Confusing</option>
            </select>
            {form.formState.errors.category && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.category.message}
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <Label
              htmlFor="message"
              className="text-sm font-medium text-slate-700"
            >
              Message *
            </Label>
            <textarea
              id="message"
              {...form.register("message")}
              rows={4}
              placeholder="Describe the issue or share your idea..."
              className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-1 flex justify-between">
              {form.formState.errors.message && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.message.message}
                </p>
              )}
              <p className="ml-auto text-xs text-slate-500">
                {messageLength} / 10 minimum characters
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
              className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
