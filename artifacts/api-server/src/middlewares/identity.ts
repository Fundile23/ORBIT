import { getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";

export function owner(req: Request): string {
  const userId = getAuth(req).userId;
  if (!userId) throw new Error("Authenticated owner required");
  return userId;
}
export const requireIdentity: RequestHandler = (req, res, next) => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Sign in to access your private ORBIT space." });
    return;
  }
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Vary", "Cookie");
  next();
};

// Cookie-authenticated writes are same-origin only. No wildcard CORS.
export const sameOriginWrite: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  const origin = req.get("origin");
  const host = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0]?.trim();
  try {
    if (!origin || new URL(origin).host !== host || req.get("sec-fetch-site") === "cross-site") {
      res.status(403).json({ error: "Cross-origin writes are not permitted." });
      return;
    }
  } catch {
    res.status(403).json({ error: "Invalid request origin." });
    return;
  }
  next();
};
