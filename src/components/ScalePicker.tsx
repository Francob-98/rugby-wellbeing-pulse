import { cn } from "@/lib/utils";

interface ScalePickerProps {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  lowLabel: string;
  highLabel: string;
  hint?: string;
}

export function ScalePicker({ label, value, onChange, min = 1, max = 5, lowLabel, highLabel, hint }: ScalePickerProps) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-lg font-semibold uppercase">{label}</span>
        {hint && <span className="text-sm font-medium text-accent">{hint}</span>}
      </div>
      <div className="flex gap-1.5">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-12 flex-1 rounded-md border border-border bg-card font-display text-xl font-semibold transition-all",
              value === n
                ? "border-primary bg-primary text-primary-foreground scale-105 shadow-md"
                : "hover:border-primary/50 hover:bg-secondary",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
