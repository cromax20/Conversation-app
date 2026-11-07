"use client";

import { useCallback, useEffect, useState } from "react";

// Mode écrit (transports, lieux calmes) : pas de son ni de micro. Mémorisé sur cet appareil.
const KEY = "atelier:written-mode";
const EVENT = "atelier:written-mode";

export function useWrittenMode(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try { setOn(localStorage.getItem(KEY) === "1"); } catch {}
    const sync = () => { try { setOn(localStorage.getItem(KEY) === "1"); } catch {} };
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const set = useCallback((v: boolean) => {
    setOn(v);
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [on, set];
}
