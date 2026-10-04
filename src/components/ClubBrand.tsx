import { Link } from "@tanstack/react-router";
import crestAsset from "@/assets/cbmm-escudo-transparente.png";
import { cn } from "@/lib/utils";

export function ClubCrest({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", className)}>
      <img src={crestAsset} alt="Escudo del Club Biblioteca Mariano Moreno" className="h-full w-full object-contain" />
    </span>
  );
}

export function ClubBrand({ to = "/", compact = false, className }: { to?: "/" | "/panel"; compact?: boolean; className?: string }) {
  return (
    <Link to={to} className={cn("inline-flex items-center gap-3", className)}>
      <ClubCrest className={compact ? "size-9" : "size-12"} />
      <span className="font-display font-semibold uppercase leading-none">
        <span className="block text-sm">CBMM</span>
        {!compact && <span className="mt-1 block text-xs font-medium text-current/65">Rugby</span>}
      </span>
    </Link>
  );
}