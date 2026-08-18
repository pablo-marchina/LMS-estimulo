import { QuickCheckForm } from "@/components/quick-check-form";
import type { AssessmentQuestion } from "@/lib/journey-runtime/contracts";

type Props = {
  journeyInstanceId: string;
  stepInstanceId: string;
  idempotencyKey: string;
  questions: AssessmentQuestion[];
  passingScore: number | null;
  maxAttempts: number | null;
  attemptsUsed: number;
  attemptAvailable: boolean;
  passed: boolean;
  requiredAssets: Array<{ id: string; completed: boolean }>;
  sectionsComplete: boolean;
  embedded?: boolean;
};

export function QuickCheckPanel({ questions, ...props }: Props) {
  const participantQuestions = questions.map(({ response, ...question }) => ({
    ...question,
    responseRecorded: Boolean(response),
  }));

  return <QuickCheckForm {...props} questions={participantQuestions} />;
}
