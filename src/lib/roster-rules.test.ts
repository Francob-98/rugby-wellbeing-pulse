import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { playerStatusPatch, staffActions } from "./roster-rules";
import { PLAYER_LINES } from "./constants";

describe("plantel and access rules", () => {
  it("deactivates without changing or deleting player history", () => {
    assert.deepEqual(playerStatusPatch(false), { active: false });
    assert.deepEqual(playerStatusPatch(true), { active: true });
  });
  it("offers only player-confirmed Forwards and Backs", () => {
    assert.deepEqual([...PLAYER_LINES], ["Forwards", "Backs"]);
  });
  it("allows rejection of pending staff", () => {
    assert.deepEqual(staffActions([]), ["approved", "rejected"]);
  });
  it("allows revoking existing staff access", () => {
    assert.deepEqual(staffActions(["staff"]), ["revoked"]);
  });
  it("protects admin access", () => {
    assert.deepEqual(staffActions(["admin", "staff"]), []);
  });
  it("allows reconsidering rejected access", () => {
    assert.deepEqual(staffActions([], "rejected"), ["approved"]);
  });
});