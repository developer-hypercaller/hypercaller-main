"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function Progress({ currentStep, totalSteps }: ProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 h-2 rounded-full transition-all",
              index < currentStep
                ? "bg-foreground"
                : index === currentStep
                ? "bg-foreground/50"
                : "bg-muted"
            )}
          />
        ))}
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
}

