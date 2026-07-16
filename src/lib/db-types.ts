export type ProfileRow = {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  grade?: string | null;
  course?: string | null;
  age?: number | null;
  source?: string | null;
  challenge?: string | null;
  goal?: string | null;
  pace?: string | null;
  plan?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  paddle_customer_id?: string | null;
  paddle_subscription_id?: string | null;
  paddle_price_id?: string | null;
  created_at?: string | null;
  onboarding_completed?: boolean | null;
  diagnostic_score?: number | null;
  recommended_topic?: string | null;
  difficulty_level?: number | null;
  diagnostic_answers?: string[] | null;
  misconception_data?: JsonValue | null; // For tracking error patterns
};