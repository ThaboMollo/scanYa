import type { Session, User } from "@scanya/shared";
import type { Request } from "express";

export type AuthenticatedRequest = Request & {
  session?: Session;
  user?: User;
};
