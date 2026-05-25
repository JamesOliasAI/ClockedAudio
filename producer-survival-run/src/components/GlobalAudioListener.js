"use client";
import { useEffect } from "react";

export default function GlobalAudioListener() {
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // Check if the clicked element is a button, a link, or has role="button"
      const target = e.target.closest('button, a, [role="button"]');
      if (target) {
        const audio = new Audio('/sounds/menubuttonsfx.mp3');
        audio.volume = 0.5;
        audio.play().catch(err => {
          // Ignore auto-play blocking errors silently
        });
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  return null;
}
