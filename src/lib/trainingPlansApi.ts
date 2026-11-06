// Browser client for the training plans API (server/training-plans.server.ts). Every function
// resolves to an ApiResult and never throws. A failed save carries `fieldErrors` keyed like the
// shared rules ("title", "schedule.0.drillName", "athleteIds", ...).

import { apiRequest, type ApiResult } from "@/auth/authClient";
import type { PlanInput, PlanStatus } from "@/lib/trainingPlanRules";

export type { ApiResult };

export interface TrainingPlan {
  id: string;
  status: PlanStatus;
  title: string;
  description: string;
  sport: string;
  skillFocus: string;
  startDate: string | null;
  endDate: string | null;
  schedule: { day: string; drillName: string; durationMinutes: number; intensity: string }[];
  goals: string[];
  athletes: { id: string; displayName: string; connected: boolean }[];
  coach: { id: string; displayName: string };
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SavePlanBody = PlanInput & { status: PlanStatus };

export const getTrainingPlan = (id: string, signal?: AbortSignal) =>
  apiRequest<{ plan: TrainingPlan }>(`/api/training-plans/${encodeURIComponent(id)}`, signal ? { signal } : {});

export const createTrainingPlan = (body: SavePlanBody) =>
  apiRequest<{ plan: TrainingPlan }>("/api/training-plans", { method: "POST", body });

export const updateTrainingPlan = (id: string, body: SavePlanBody) =>
  apiRequest<{ plan: TrainingPlan }>(`/api/training-plans/${encodeURIComponent(id)}`, { method: "PUT", body });
