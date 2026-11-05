import { useEffect } from "react";
import { ClubCrest } from "@/components/ClubBrand";

export function ClubIntro({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2800);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="club-intro fixed inset-0 z-50 flex items-center justify-center bg-pitch px-6 text-pitch-foreground" role="status" aria-label="Bienvenido al Club Biblioteca Mariano Moreno">
      <div className="club-intro-identity flex w-full max-w-lg flex-col items-center text-center">
        <ClubCrest className="club-intro-crest size-36 sm:size-44" />
        <div className="club-intro-rule mt-8 h-1 w-12 bg-primary" />
        <h1 className="club-intro-name mt-6 font-display text-4xl font-semibold uppercase leading-tight sm:text-5xl">
          <span className="block">Club Biblioteca</span>
          <span className="block">Mariano Moreno</span>
        </h1>
      </div>
    </div>
  );
}