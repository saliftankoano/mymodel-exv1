import { PiggyBank } from "lucide-react";
import { motion } from "framer-motion";

interface EarningsDisplayProps {
  selectedOptions: Record<string, boolean>;
  calculateTotalEarnings: () => number;
  isConsented: boolean;
  consentDate: string;
  formatDate: (date: string) => string;
  getNextPayoutDate: (date: string) => string;
}

export function EarningsDisplay({
  selectedOptions,
  calculateTotalEarnings,
  isConsented,
  consentDate,
  formatDate,
  getNextPayoutDate,
}: EarningsDisplayProps) {
  return (
    <motion.div
      className="earnings-display"
      animate={{
        scale: Object.values(selectedOptions).some(Boolean) ? 1 : 0.95,
      }}
    >
      <div className="earnings-header">
        <PiggyBank className="earnings-icon" />
        <div className="earnings-text">
          <span className="earnings-amount">${calculateTotalEarnings()}</span>
          <span className="earnings-period">/month</span>
        </div>
      </div>
      {isConsented && consentDate && (
        <div className="earnings-info">
          <div className="consent-date">Started: {formatDate(consentDate)}</div>
          <div className="next-payout">
            Next payout: {getNextPayoutDate(consentDate)}
          </div>
        </div>
      )}
    </motion.div>
  );
}
