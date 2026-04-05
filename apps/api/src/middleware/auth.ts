import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const attachAuth = async (
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
) => {
  try {
    const authorization = request.headers?.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authorization.slice("Bearer ".length);
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (!error && data.user) {
      request.userId = data.user.id;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      request.userRole = profile?.role;
    }

    next();
  } catch {
    next();
  }
};

export const requireAuth = (
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) => {
  if (!request.userId) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
};

export const requireRole =
  (...roles: string[]) =>
  (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (!request.userId) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!request.userRole || !roles.includes(request.userRole)) {
      response.status(403).json({ error: "You do not have access to this action." });
      return;
    }
    next();
  };
