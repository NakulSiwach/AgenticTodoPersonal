"use client";

import { useEffect, useState } from "react";
import { today as todayISO } from "./dates";

/** Local "today", refreshed so the app stays right when left open past midnight. */
export function useToday(): string {
  const [day, setDay] = useState(() => todayISO());
  useEffect(() => {
    const tick = () => setDay(todayISO());
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return day;
}
