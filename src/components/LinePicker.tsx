import { PLAYER_LINES } from "@/lib/constants";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LinePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>¿Forward o back?</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Elegí tu línea" /></SelectTrigger>
        <SelectContent>{PLAYER_LINES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
