import "./App.css";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, Mail, MapPin, Check } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { AuthComponent } from "./components/Auth";
import { EarningsDisplay } from "./components/EarningsDisplay";
import { DataOptions } from "./components/DataOptions";
import type { DataOption, UserPreferences } from "./types/types";
import type { Session } from "@supabase/supabase-js";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConsented, setIsConsented] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [consentDate, setConsentDate] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, boolean>
  >({});
  const [showSignInSuccess, setShowSignInSuccess] = useState(false);

  const initializeStateFromStorage = useCallback(() => {
    const savedPreferences = localStorage.getItem("userPreferences");
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences) as UserPreferences;
        setIsConsented(preferences.userConsent);
        setSelectedOptions(preferences.dataPreferences);
        setConsentDate(preferences.consentDate);
      } catch (e) {
        console.error("Error parsing localStorage preferences:", e);
        setIsConsented(false);
        setSelectedOptions({});
        setConsentDate("");
      }
    }
  }, []);

  const loadUserPreferences = useCallback(
    async (userId: string) => {
      try {
        console.log("Loading preferences for user:", userId);
        const { data, error } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error) {
          console.error("Error fetching preferences:", error);
          if (error.code === "PGRST116") {
            console.log("No preferences found for user, creating new record");
            const newPreferences = {
              userConsent: false,
              consentDate: "",
              dataPreferences: {},
            };
            setIsConsented(false);
            setSelectedOptions({});
            setConsentDate("");
            localStorage.setItem(
              "userPreferences",
              JSON.stringify(newPreferences)
            );
          } else {
            throw error;
          }
        }

        if (data) {
          console.log("Found preferences in Supabase:", data);
          const preferences: UserPreferences = {
            userConsent: true,
            consentDate: data.consent_date,
            dataPreferences: data.preferences || {},
          };
          localStorage.setItem("userPreferences", JSON.stringify(preferences));
          setIsConsented(true);
          setSelectedOptions(data.preferences || {});
          setConsentDate(data.consent_date);
        }
      } catch (error) {
        console.error("Error in loadUserPreferences:", error);
        initializeStateFromStorage();
      }
    },
    [initializeStateFromStorage]
  );

  useEffect(() => {
    const accessToken = new URLSearchParams(
      window.location.hash.substring(1)
    ).get("access_token");
    const authInProgress = localStorage.getItem("authInProgress");

    initializeStateFromStorage();

    if (accessToken && authInProgress) {
      console.log("Detected return from auth redirect");
      localStorage.removeItem("authInProgress");
      chrome.runtime.sendMessage({
        type: "AUTH_SUCCESS",
        accessToken: accessToken,
      });
      window.close();
    }

    const handleMessage = (message: { type: string }) => {
      if (message.type === "REFRESH_AUTH") {
        window.location.reload();
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session);
      setSession(session);
      if (session) {
        loadUserPreferences(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state changed:", event, currentSession);
      setSession(currentSession);
      setLoading(false);

      if (currentSession && event === "SIGNED_IN") {
        await loadUserPreferences(currentSession.user.id);
        setShowSignInSuccess(true);
        setTimeout(() => window.close(), 1500);
      } else if (event === "SIGNED_OUT") {
        setIsConsented(false);
        setSelectedOptions({});
        setConsentDate("");
        localStorage.removeItem("userPreferences");
      }
    });

    console.log("Component mounted");

    return () => {
      subscription.unsubscribe();
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [loadUserPreferences, initializeStateFromStorage]);

  useEffect(() => {
    console.log("Loading state:", loading);
    console.log("Session state:", session);
  }, [loading, session]);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const preferencesData = {
        user_id: user.id,
        consent_date: preferences.consentDate,
        preferences: preferences.dataPreferences,
        updated_at: new Date().toISOString(),
      };

      console.log("About to upsert with data:", preferencesData);
      const { data, error } = await supabase
        .from("user_preferences")
        .upsert(preferencesData)
        .select();

      if (error) throw error;
      console.log("Upsert completed:", data);

      return data;
    } catch (error) {
      console.error("Error in saveToSupabase:", error);
      throw error;
    }
  };

  const toggleOption = (optionId: string) => {
    setSelectedOptions((prev) => {
      const newOptions = {
        ...prev,
        [optionId]: !prev[optionId],
      };

      if (isConsented) {
        setIsConsented(false);
        setConsentDate("");
      }

      return newOptions;
    });
  };

  const handleConsent = async () => {
    try {
      setShowSuccess(false);

      if (Object.keys(selectedOptions).length === 0) {
        alert("Please select at least one data option before saving.");
        return;
      }

      const currentDate = new Date().toISOString();
      const preferences: UserPreferences = {
        userConsent: true,
        consentDate: currentDate,
        dataPreferences: selectedOptions,
      };

      console.log("Attempting to save preferences:", preferences);

      // Save to Supabase first
      await saveToSupabase(preferences);

      // If Supabase save is successful, update local storage and state
      localStorage.setItem("userPreferences", JSON.stringify(preferences));
      await chrome.storage.local.set(preferences);

      // Update state AFTER successful save
      setIsConsented(true);
      setConsentDate(currentDate);
      setSelectedOptions(preferences.dataPreferences);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      alert("Failed to save your preferences. Please try again.");
      // On error, reload the last known good state
      if (session?.user) {
        await loadUserPreferences(session.user.id);
      }
    }
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
      date.setDate(date.getDate() + 30);
      return formatDate(date.toISOString());
    } catch (e: unknown) {
      if (e instanceof Error) {
        return e.message;
      }
      return "Invalid date";
    }
  };

  return loading ? (
    <div>Loading...</div>
  ) : session ? (
    (console.log("Rendering main app - session exists"),
    (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container"
      >
        <div className="brand">
          <h1 className="brand-name">my model</h1>
          <button
            className="logout-button"
            onClick={() => supabase.auth.signOut()}
          >
            Logout
          </button>
        </div>

        <EarningsDisplay
          selectedOptions={selectedOptions}
          calculateTotalEarnings={calculateTotalEarnings}
          isConsented={isConsented}
          consentDate={consentDate}
          formatDate={formatDate}
          getNextPayoutDate={getNextPayoutDate}
        />

        <DataOptions
          dataOptions={dataOptions}
          selectedOptions={selectedOptions}
          toggleOption={toggleOption}
        />

        <motion.button
          className={`consent-button ${isConsented ? "saved" : "unsaved"} ${
            showSuccess ? "success" : ""
          }`}
          onClick={handleConsent}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={Object.keys(selectedOptions).length === 0}
        >
          {isConsented ? "Preferences Saved" : "Save Preferences"}
        </motion.button>

        <AnimatePresence mode="wait">
          {showSuccess && (
            <motion.div
              className="success-overlay"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="success-content">
                <Check className="success-icon" />
                <p>Data collection started!</p>
                <span>You'll start earning soon</span>
              </div>
            </motion.div>
          )}
          {showSignInSuccess && (
            <motion.div
              className="success-overlay"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="success-content">
                <Check className="success-icon" />
                <p>Successfully signed in!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    ))
  ) : (
    (console.log("Rendering Auth component - no session"), (<AuthComponent />))
  );
}

export default App;
