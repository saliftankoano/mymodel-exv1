import { motion } from "framer-motion";
import { DataOption } from "../types/types";

interface DataOptionsProps {
  dataOptions: DataOption[];
  selectedOptions: Record<string, boolean>;
  toggleOption: (optionId: string) => void;
}

export function DataOptions({
  dataOptions,
  selectedOptions,
  toggleOption,
}: DataOptionsProps) {
  return (
    <div className="options-list">
      {dataOptions.map((option) => (
        <motion.div
          key={option.id}
          className="option-item"
          onClick={() => toggleOption(option.id)}
          whileHover={{ x: 2 }}
        >
          <div className="option-content">
            <span className="option-icon">{option.icon}</span>
            <div className="option-text">
              <span className="option-label">{option.label}</span>
              <span className="option-description">{option.description}</span>
            </div>
            <div className="earning-tag">+${option.monthlyEarning}</div>
          </div>
          <div
            className={`toggle ${selectedOptions[option.id] ? "active" : ""}`}
          >
            <div className="toggle-slider" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
