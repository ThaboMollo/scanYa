import { store } from "./store.js";
import type { AuthenticatedRequest } from "./types.js";
import type { Response, NextFunction } from "express";

const getTokenFromHeader = (authorization?: string) => {
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.slice("Bearer ".length);
};

export const attachAuth = (
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
) => {
    const token = getTokenFromHeader(request.headers.authorization);
    const session = store.getSession(token);

    if (session) {
      request.session = session;
      request.user = store.getUserById(session.userId) ?? undefined;
    }

    next();
  };

export const requireAuth = (
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) => {
  if (!request.user) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  next();
};

export const requireRole =
  (...roles: string[]) =>
  (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (!request.user) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    if (!roles.includes(request.user.role)) {
      response.status(403).json({ error: "You do not have access to this action." });
      return;
    }

    next();
  };
