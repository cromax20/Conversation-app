import { NextResponse } from "next/server";

export const jsonError = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

export const unauthorized = () => jsonError(401, "unauthorized", "Connectez-vous pour continuer.");
export const notFound = () => jsonError(404, "not_found", "Conversation introuvable.");
