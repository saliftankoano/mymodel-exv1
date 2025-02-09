export interface UserPreferences {
  browser_id: string;
  consent_date: string;
  preferences: Record<string, boolean>;
  updated_at: string;
}
