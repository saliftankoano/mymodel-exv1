import { supabase } from "../lib/supabaseClient";

export function AuthComponent() {
  const handleGoogleLogin = async () => {
    try {
      console.log("Starting Google login...");
      const extensionId = chrome.runtime.id;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          skipBrowserRedirect: true,
          redirectTo: `chrome-extension://${extensionId}/index.html`,
          queryParams: {
            prompt: "select_account",
            access_type: "offline",
          },
        },
      });

      if (error) {
        console.error("Auth error:", error);
        alert(`Auth error: ${error.message}`);
        return;
      }

      if (data?.url) {
        console.log("Auth URL:", data.url);
        const popup = window.open(
          data.url,
          "Login",
          "width=600,height=800,status=yes,scrollbars=yes"
        );

        if (!popup) {
          alert("Popup blocked! Please allow popups for this site.");
          return;
        }

        const checkPopupClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopupClosed);
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                chrome.runtime.sendMessage({
                  type: "AUTH_STATE_CHANGED",
                  session,
                });
              }
            });
          }
        }, 500);
      }
    } catch (err) {
      console.error("Unexpected error during login:", err);
      alert("An unexpected error occurred during login");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <h1 className="brand-name">my model</h1>
        <p className="auth-description">
          Join us to start earning from your data
        </p>
        <button onClick={handleGoogleLogin} className="google-login-button">
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="google-icon"
          />
          <span>Continue with Google</span>
        </button>
        <p className="auth-footer">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
