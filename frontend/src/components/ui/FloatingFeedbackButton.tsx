"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { FeedbackModal } from "./FeedbackModal";

export function FloatingFeedbackButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
        title="Send Feedback"
        aria-label="Send Feedback"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
