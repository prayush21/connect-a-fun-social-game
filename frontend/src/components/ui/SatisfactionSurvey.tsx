"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { submitSatisfactionSurvey } from "@/lib/firebase/game";

const surveySchema = z.object({
  satisfaction: z.string().min(1, "Please select a rating"),
  comment: z.string().optional(),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SatisfactionSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  gameData?: {
    roomId?: string;
    roundNumber?: number;
    winner?: string;
  };
}

export function SatisfactionSurvey({
  isOpen,
  onClose,
  gameData,
}: SatisfactionSurveyProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sessionId } = useStore();

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      satisfaction: "",
      comment: "",
    },
  });

  const selectedRating = form.watch("satisfaction");

  const shouldShowSurvey = () => {
    // Check 10-minute rate limiting (reduced from 24 hours for testing)
    const lastSurveyTime = localStorage.getItem("connect_last_survey");
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    if (lastSurveyTime && now - parseInt(lastSurveyTime) < tenMinutes) {
      return false; // Already shown within threshold time
    }

    // 1-in-5 chance (20%)
    return Math.random() < 0.2;
  };

  const onSubmit = async (data: SurveyFormData) => {
    setIsSubmitting(true);
    try {
      const surveyData = {
        roomId: gameData?.roomId || null,
        roundNumber: gameData?.roundNumber || 1,
        winner: gameData?.winner || null,
        rating: parseInt(data.satisfaction),
        comment: data.comment?.trim() || null,
        createdAt: new Date(),
        userId: sessionId || null,
        sessionId: generateSessionId(),
      };

      // Submit to Firestore
      await submitSatisfactionSurvey(surveyData);

      // Update rate limiting
      localStorage.setItem("connect_last_survey", Date.now().toString());

      onClose();
      form.reset();

      // Show success message
      console.log("Survey submitted successfully!");
    } catch (error) {
      console.error("Failed to submit survey:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Still update rate limiting so it doesn't show again
    localStorage.setItem("connect_last_survey", Date.now().toString());
    onClose();
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

  if (!isOpen || !shouldShowSurvey()) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            How was this round?
          </h2>
          <p className="text-sm text-slate-600">Help us improve the game!</p>
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Rating Scale */}
          <div>
            <Label className="mb-3 block text-sm font-medium text-slate-700">
              How satisfied are you with this round?
            </Label>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-slate-500">Not at all</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((rating) => (
                  <label
                    key={rating}
                    className="flex cursor-pointer flex-col items-center"
                  >
                    <input
                      type="radio"
                      value={rating.toString()}
                      {...form.register("satisfaction")}
                      className="sr-only"
                    />
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all hover:border-indigo-400 ${
                        selectedRating === rating.toString()
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {rating}
                    </div>
                  </label>
                ))}
              </div>
              <span className="text-xs text-slate-500">Very satisfied</span>
            </div>
            {form.formState.errors.satisfaction && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.satisfaction.message}
              </p>
            )}
          </div>

          {/* Optional Comment */}
          <div>
            <Label
              htmlFor="comment"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              One thing we should fix (optional)
            </Label>
            <textarea
              id="comment"
              {...form.register("comment")}
              rows={3}
              placeholder="What could make this game better?"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedRating}
              className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
