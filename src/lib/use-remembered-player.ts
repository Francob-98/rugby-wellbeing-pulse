import { useEffect, useState } from "react";

const KEY = "cbmm-player-id";

export function useRememberedPlayer() {
  const [id, setId] = useState("");
  useEffect(() => {
    const v = localStorage.getItem(KEY);
    if (v) setId(v);
  }, []);
  const update = (v: string) => {
    setId(v);
    localStorage.setItem(KEY, v);
  };
  return [id, update] as const;
}
