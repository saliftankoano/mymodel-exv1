import { ReactNode } from "react";

export interface DataOption {
  id: string;
  label: string;
  icon: ReactNode;
  description: string;
  monthlyEarning: number;
}

export interface UserPreferences {
  userConsent: boolean;
  consentDate: string;
  dataPreferences: Record<string, boolean>;
}
