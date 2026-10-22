export type StaffDecision = "approved" | "rejected" | "revoked";

export function playerStatusPatch(active: boolean) {
  return { active };
}

export function staffActions(roles: readonly string[], status?: string): StaffDecision[] {
  if (roles.includes("admin")) return [];
  if (roles.includes("staff")) return ["revoked"];
  return status === "rejected" || status === "revoked" ? ["approved"] : ["approved", "rejected"];
}