import { z } from "zod";

export const mcOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
});
export type McOption = z.infer<typeof mcOptionSchema>;

export const multipleChoiceQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("mc"),
  question: z.string().min(1),
  options: z.array(mcOptionSchema).length(4),
  correctOptionId: z.string(),
  explanation: z.string().min(1),
  points: z.number().int().positive().default(1),
});
export type MultipleChoiceQuestion = z.infer<typeof multipleChoiceQuestionSchema>;

export const trueFalseQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("tf"),
  question: z.string().min(1),
  correctAnswer: z.boolean(),
  explanation: z.string().min(1),
  points: z.number().int().positive().default(1),
});
export type TrueFalseQuestion = z.infer<typeof trueFalseQuestionSchema>;

export const fillBlankSchema = z.object({
  id: z.string(),
  acceptedAnswers: z.array(z.string().min(1)).min(1),
});
export type FillBlank = z.infer<typeof fillBlankSchema>;

export const fillInBlankQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("fill"),
  question: z.string().min(1),
  blanks: z.array(fillBlankSchema).min(1),
  explanation: z.string().min(1),
  points: z.number().int().positive().default(2),
});
export type FillInBlankQuestion = z.infer<typeof fillInBlankQuestionSchema>;

export const matchingPairSchema = z.object({
  left: z.string().min(1),
  right: z.string().min(1),
});
export type MatchingPair = z.infer<typeof matchingPairSchema>;

export const matchingQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("match"),
  question: z.string().min(1),
  pairs: z.array(matchingPairSchema).min(2),
  explanation: z.string().min(1),
  points: z.number().int().positive().default(3),
});
export type MatchingQuestion = z.infer<typeof matchingQuestionSchema>;

export const shortAnswerQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("short"),
  question: z.string().min(1),
  rubric: z.string().min(1),
  points: z.number().int().positive().default(3),
});
export type ShortAnswerQuestion = z.infer<typeof shortAnswerQuestionSchema>;

export const orderItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderingQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("order"),
  question: z.string().min(1),
  correctOrder: z.array(orderItemSchema).min(2),
  explanation: z.string().min(1),
  points: z.number().int().positive().default(2),
});
export type OrderingQuestion = z.infer<typeof orderingQuestionSchema>;

export const flashcardSchema = z.object({
  id: z.string(),
  type: z.literal("flash"),
  front: z.string().min(1),
  back: z.string().min(1),
});
export type Flashcard = z.infer<typeof flashcardSchema>;

export const baseQuestionSchema = z.discriminatedUnion("type", [
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  fillInBlankQuestionSchema,
  matchingQuestionSchema,
  shortAnswerQuestionSchema,
  orderingQuestionSchema,
]);
export type BaseQuestion = z.infer<typeof baseQuestionSchema>;

export const scenarioSubQuestionSchema = z.discriminatedUnion("type", [
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  shortAnswerQuestionSchema,
]);
export type ScenarioSubQuestion = z.infer<typeof scenarioSubQuestionSchema>;

export const scenarioQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("scenario"),
  scenario: z.string().min(1),
  subQuestions: z.array(scenarioSubQuestionSchema).min(1),
  points: z.number().int().positive().default(5),
});
export type ScenarioQuestion = z.infer<typeof scenarioQuestionSchema>;

export const miniQuizQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("quiz"),
  title: z.string().min(1),
  questions: z.array(baseQuestionSchema).min(1),
});
export type MiniQuizQuestion = z.infer<typeof miniQuizQuestionSchema>;

export const anyQuestionSchema = z.union([
  baseQuestionSchema,
  scenarioQuestionSchema,
  miniQuizQuestionSchema,
  flashcardSchema,
]);
export type AnyQuestion = z.infer<typeof anyQuestionSchema>;

export const generatedAssignmentSchema = z.object({
  title: z.string().min(1),
  instructions: z.string().min(1),
  questions: z.array(anyQuestionSchema).min(1),
  totalPoints: z.number().int().nonnegative(),
  estimatedMinutes: z.number().int().positive().optional(),
});
export type GeneratedAssignment = z.infer<typeof generatedAssignmentSchema>;

export type QuestionType =
  | "mc"
  | "tf"
  | "fill"
  | "match"
  | "short"
  | "order"
  | "flash"
  | "scenario"
  | "quiz";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mc: "Trắc nghiệm nhiều lựa chọn",
  tf: "Đúng/Sai",
  fill: "Điền vào chỗ trống",
  match: "Nối đôi",
  short: "Trả lời ngắn",
  order: "Sắp xếp thứ tự",
  flash: "Thẻ ghi nhớ",
  scenario: "Câu hỏi tình huống",
  quiz: "Mini kiểm tra",
};
