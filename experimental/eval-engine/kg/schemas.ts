import { z } from "zod";

export const LearningGoalSchema = z.object({
  type: z.literal("LearningGoal"),
  id: z.string().regex(/^lg\./, "LearningGoal id must start with 'lg.'"),
  question: z.string().min(1),
  summary: z.string().min(1),
  prerequisites: z.array(z.string().regex(/^lg\./)).default([]),
  teaches: z.array(z.string().regex(/^fact\./)).default([]),
  addresses: z.array(z.string().regex(/^misc\./)).default([]),
});

export const AtomicFactSchema = z.object({
  type: z.literal("AtomicFact"),
  id: z.string().regex(/^fact\./),
  statement: z.string().min(1),
  scope: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
  cites: z.array(z.string().regex(/^src\./)).default([]),
});

export const MisconceptionSchema = z.object({
  type: z.literal("Misconception"),
  id: z.string().regex(/^misc\./),
  name: z.string().min(1),
  statement: z.string().min(1),
  correction: z.string().min(1),
  correctedBy: z.array(z.string().regex(/^fact\./)).default([]),
});

export const SourceExcerptSchema = z.object({
  type: z.literal("SourceExcerpt"),
  id: z.string().regex(/^src\./),
  sourceType: z.enum(["NEC", "MikeHolt", "IAEI"]),
  citation: z.string().min(1),
  text: z.string().min(1),
  url: z.string().url().nullable().optional(),
});

export type LearningGoal = z.infer<typeof LearningGoalSchema>;
export type AtomicFact = z.infer<typeof AtomicFactSchema>;
export type Misconception = z.infer<typeof MisconceptionSchema>;
export type SourceExcerpt = z.infer<typeof SourceExcerptSchema>;

export type LearningGoalId = string;
export type AtomicFactId = string;
export type MisconceptionId = string;
export type SourceExcerptId = string;
