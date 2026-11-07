"use client";
import { useEffect } from "react";
export default function ScrollToCurrent() {
  useEffect(() => {
    document.getElementById("ici")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);
  return null;
}
