import "./App.css";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, Mail, MapPin, Check, PiggyBank } from "lucide-react";
import { supabase } from "./lib/supabaseClient";

interface DataOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  monthlyEarning: number;
}

interface UserPreferences {
  userConsent: boolean;
  consentDate: string;
  dataPreferences: Record<string, boolean>;
}

function App() {
  const [isConsented, setIsConsented] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [consentDate, setConsentDate] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, boolean>
  >({});

  // Load saved preferences from local storage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem("userPreferences");
    if (savedPreferences) {
      try {
        const preferences: UserPreferences = JSON.parse(savedPreferences);
        setIsConsented(preferences.userConsent);
        setSelectedOptions(preferences.dataPreferences);
        setConsentDate(preferences.consentDate);
      } catch (error) {
        console.error("Error parsing saved preferences:", error);
      }
    }
  }, []);

  const dataOptions: DataOption[] = [
    {
      id: "websiteActivity",
      label: "Website Activity",
      icon: <Navigation className="w-4 h-4" />,
      description: "Websites you visit",
      monthlyEarning: 3,
    },
    {
      id: "emailData",
      label: "Email Data",
      icon: <Mail className="w-4 h-4" />,
      description: "Emails from brands",
      monthlyEarning: 5,
    },
    {
      id: "locationData",
      label: "Location",
      icon: <MapPin className="w-4 h-4" />,
      description: "Location data from your device",
      monthlyEarning: 3,
    },
  ];

  const calculateTotalEarnings = () => {
    return Object.entries(selectedOptions).reduce(
      (total, [key, isSelected]) => {
        if (isSelected) {
          const option = dataOptions.find((opt) => opt.id === key);
          return total + (option?.monthlyEarning || 0);
        }
        return total;
      },
      0
    );
  };

  const saveToSupabase = async (preferences: UserPreferences) => {
    try {
      // Get the user's browser ID or generate one if it doesn't exist
      let browserId = localStorage.getItem("browserId");
      if (!browserId) {
        browserId = crypto.randomUUID();
        localStorage.setItem("browserId", browserId);
      }

      const { error } = await supabase.from("user_preferences").upsert({
        browser_id: browserId,
        consent_date: preferences.consentDate,
        preferences: preferences.dataPreferences,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving to Supabase:", error);
      // Continue even if Supabase save fails - we have local storage backup
    }
  };

  const handleConsent = async () => {
    try {
      if (!Object.values(selectedOptions).some(Boolean)) {
        alert("Please select at least one option");
        return;
      }

      const currentDate = new Date().toISOString();
      const preferences: UserPreferences = {
        userConsent: true,
        consentDate: currentDate,
        dataPreferences: selectedOptions,
      };

      // Save to local storage
      localStorage.setItem("userPreferences", JSON.stringify(preferences));

      // Save to chrome storage for extension persistence
      await chrome.storage.local.set(preferences);

      // Attempt to save to Supabase
      await saveToSupabase(preferences);

      setIsConsented(true);
      setConsentDate(currentDate);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      alert("Failed to save your preferences. Please try again.");
    }
  };

  const toggleOption = (optionId: string) => {
    if (isConsented) {
      const confirmChange = window.confirm(
        "Changing your preferences will reset your earning period. Your current earnings won't be processed. Do you want to continue?"
      );
      if (!confirmChange) return;
    }

    setSelectedOptions((prev) => {
      const newOptions = {
        ...prev,
        [optionId]: !prev[optionId],
      };

      // If we're already consented, save changes immediately
      if (isConsented) {
        const currentDate = new Date().toISOString();
        const preferences: UserPreferences = {
          userConsent: true,
          consentDate: currentDate,
          dataPreferences: newOptions,
        };
        localStorage.setItem("userPreferences", JSON.stringify(preferences));
        setConsentDate(currentDate);
        saveToSupabase(preferences).catch(console.error);
      }

      return newOptions;
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        return e.message;
      }
      return "Invalid date";
    }
  };

  const getNextPayoutDate = (startDate: string) => {
    if (!startDate) return "";
    try {
      const date = new Date(startDate);
      date.setDate(date.getDate() + 30); // Add 30 days
      return formatDate(date.toISOString());
    } catch (e: unknown) {
      if (e instanceof Error) {
        return e.message;
      }
      return "Invalid date";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container"
    >
      <div className="brand">
        <h1 className="brand-name">my model</h1>
      </div>

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
            <div className="consent-date">
              Started: {formatDate(consentDate)}
            </div>
            <div className="next-payout">
              Next payout: {getNextPayoutDate(consentDate)}
            </div>
          </div>
        )}
      </motion.div>

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

      <motion.button
        className="consent-button"
        onClick={handleConsent}
        disabled={!Object.values(selectedOptions).some(Boolean)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isConsented ? "Preferences Saved" : "Start Earning"}
      </motion.button>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="success-content">
              <Check className="success-icon" />
              <p>Data collection started!</p>
              <span>You'll start earning soon</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default App;
