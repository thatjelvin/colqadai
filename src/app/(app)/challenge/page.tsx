import { ChallengePageClient } from "./ChallengePageClient";

export const metadata = {
  title: "Daily Challenge | Colqad",
  description: "Solve today's problem-of-the-day for a 2x streak boost.",
};

export default function ChallengePage() {
  return <ChallengePageClient />;
}
