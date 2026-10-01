import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitDone({ message, onAgain }: { message: string; onAgain: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-card p-10 text-center">
      <CheckCircle2 className="size-14 text-success" />
      <h2 className="mt-4 font-display text-3xl font-bold uppercase">¡Gracias!</h2>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <div className="mt-6 flex gap-2">
        <Button variant="outline" onClick={onAgain}>Cargar otro</Button>
        <Button asChild><Link to="/">Inicio</Link></Button>
      </div>
    </div>
  );
}
