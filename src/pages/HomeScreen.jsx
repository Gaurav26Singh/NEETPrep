import { useEffect, useState } from "react";
import { auth, googleProvider, isFirebaseConfigured } from "../firebase";
import {
  applyActionCode,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import googleLogo from "../assets/Google__G__logo.svg.png";

const initialLogin = { email: "", password: "" };
const initialSignup = { name: "", email: "", password: "", confirmPassword: "" };
const pendingAuthKey = "neetprep_pending_auth";
const verificationThrottleKey = "neetprep_verification_throttle";
const verificationThrottleWindowMs = 60_000;

const savePendingAuth = (payload) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(pendingAuthKey, JSON.stringify(payload));
  } catch {
    // ignore storage failure
  }
};

const clearPendingAuth = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(pendingAuthKey);
};

const hasVerificationCooldown = (email) => {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(verificationThrottleKey);
    if (!raw) return false;
    const throttle = JSON.parse(raw);
    if (throttle.email !== email) return false;
    return Date.now() - throttle.timestamp < verificationThrottleWindowMs;
  } catch {
    return false;
  }
};

const saveVerificationCooldown = (email) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      verificationThrottleKey,
      JSON.stringify({ email, timestamp: Date.now() })
    );
  } catch {
    // ignore storage failure
  }
};

const getAuthErrorMessage = (error) => {
  if (!error) return "Unable to complete authentication.";
  if (error.code === "auth/quota-exceeded" || error.code === "auth/too-many-requests") {
    return "Too many authentication attempts. Please wait a few minutes and try again.";
  }
  return error.message || "Unable to complete authentication.";
};


export default function HomeScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [loginValues, setLoginValues] = useState(initialLogin);
  const [signupValues, setSignupValues] = useState(initialSignup);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [verificationSentEmail, setVerificationSentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  const handleLoginChange = (key, value) => {
    setLoginValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSignupChange = (key, value) => {
    setSignupValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (!isFirebaseConfigured) {
      setError("Firebase is not configured. Please update .env with your Firebase project values.");
      setLoading(false);
      return;
    }

    try {
      if (mode === "login") {
        const { email, password } = loginValues;
        if (!email.trim() || !password.trim()) {
          setError("Please enter both email and password.");
          return;
        }

        const response = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        if (!response.user.emailVerified) {
          if (!hasVerificationCooldown(email.trim())) {
            await sendEmailVerification(response.user, {
              url: `https://neetprep-quxh.onrender.com/?mode=verifyEmail`,
              handleCodeInApp: true,
            });
            saveVerificationCooldown(email.trim());
          }
          savePendingAuth({ type: "login", email: email.trim(), password: password.trim() });
          await signOut(auth);
          setVerificationSentEmail(email.trim());
          setSuccessMessage(
            "Email not verified. A verification link has been sent to your inbox. Open the link to complete login automatically."
          );
          setError("");
          setLoading(false);
          return;
        }

        clearPendingAuth();
        onAuthSuccess({
          name: response.user.displayName || "NEET Student",
          email: response.user.email || "",
          uid: response.user.uid,
        });
        return;
      }

      const { name, email, password, confirmPassword } = signupValues;
      if (!name.trim() || !email.trim() || !password || !confirmPassword) {
        setError("Please fill in all fields to sign up.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      const response = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (response.user) {
        await updateProfile(response.user, { displayName: name.trim() });
        if (!hasVerificationCooldown(email.trim())) {
          await sendEmailVerification(response.user, {
            url: `https://neetprep-quxh.onrender.com/?mode=verifyEmail`,
            handleCodeInApp: true,
          });
          saveVerificationCooldown(email.trim());
        }
        savePendingAuth({ type: "signup", email: email.trim(), password, name: name.trim(), uid: response.user.uid });
        await signOut(auth);
        setVerificationSentEmail(email.trim());
        setSuccessMessage(
          "Verification email sent. Open the link in your inbox to complete login automatically."
        );
        setError("");
        setLoading(false);
        return;
      }
    } catch (firebaseError) {
      setError(getAuthErrorMessage(firebaseError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    if (!isFirebaseConfigured) {
      setError("Firebase is not configured. Please update .env with your Firebase project values.");
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      onAuthSuccess({
        name: user.displayName || "Google User",
        email: user.email || "",
        uid: user.uid,
      });
    } catch (firebaseError) {
      setError(firebaseError.message || "Google login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = loginValues.email.trim();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Password reset email sent. Check your inbox.");
    } catch (firebaseError) {
      setError(getAuthErrorMessage(firebaseError));
    } finally {
      setLoading(false);
    }
  };

  const submitButtonLabel = mode === "login" ? "Continue to Prep" : "Create Account";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    const oobCode = params.get("oobCode");

    if (modeParam !== "verifyEmail" || !oobCode) return;

    const verifyEmail = async () => {
      setLoading(true);
      try {
        await applyActionCode(auth, oobCode);
        clearPendingAuth();
        setSuccessMessage("Email verified successfully. Please log in to continue.");
        setMode("login");
      } catch (err) {
        setError(err.message || "Failed to verify email.");
      } finally {
        setLoading(false);
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };

    verifyEmail();
  }, [onAuthSuccess]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-sky-100 flex items-center justify-center px-4 py-6">
      <div className="max-w-6xl w-full grid gap-6 lg:grid-cols-[1.3fr_0.95fr] max-h-[calc(100vh-120px)] overflow-y-auto">
        <div className="rounded-[32px] bg-white/90 border border-white shadow-2xl shadow-slate-200/60 p-8 md:p-10 backdrop-blur-xl">
          <div className="inline-flex items-center gap-3 rounded-full bg-indigo-100/80 px-4 py-2 text-sm font-semibold text-indigo-700 mb-6">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            Start your NEET prep journey
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Welcome to NEET Prep
          </h1>
          <p className="mt-5 text-base md:text-lg text-slate-600 max-w-xl">
            Log in or sign up to unlock curated chapter tests, timer-based practice, and instant result review for Biology, Chemistry, and Physics.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-indigo-50 border border-indigo-100 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Why sign up?</h2>
              <p className="mt-3 text-sm text-slate-500">Save your progress, personalize question sets, and return to the same prep flow anytime.</p>
            </div>
            <div className="rounded-3xl bg-slate-50 border border-slate-100 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Built for NEET practice</h2>
              <p className="mt-3 text-sm text-slate-500">Practice with chapter-based mock tests using the same polished UI and study flow as the rest of the app.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Subjects</p>
              <p className="mt-2 text-sm text-slate-500">Biology, Chemistry, Physics</p>
            </div>
            <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Ready in seconds</p>
              <p className="mt-2 text-sm text-slate-500">Choose chapters, set question counts, and begin your mock test instantly.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] bg-white/95 border border-white shadow-2xl shadow-slate-200/50 p-7 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 mb-2">Account access</p>
              <h2 className="text-2xl font-bold text-slate-900 transition-all duration-300">{mode === "login" ? "Log in" : "Sign up"}</h2>
            </div>
            <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-full px-4 py-2 transition-all duration-300 ${mode === "login" ? "bg-slate-900 text-white" : "hover:bg-slate-200"}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-full px-4 py-2 transition-all duration-300 ${mode === "signup" ? "bg-slate-900 text-white" : "hover:bg-slate-200"}`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {!isFirebaseConfigured && (
            <div className="mb-6 rounded-3xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
              Firebase is not configured. Continue as guest to use the app now, or update <code>.env</code> with your Firebase project values later.
            </div>
          )}
          {successMessage && (
            <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {successMessage}
              {verificationSentEmail && (
                <div className="mt-2 text-slate-700">
                  Verification sent to <strong>{verificationSentEmail}</strong>. Then login again after confirming your email.
                </div>
              )}
            </div>
          )}
          <div 
            className="transition-all duration-300 ease-in-out"
            style={{
              animation: `fadeIn 0.3s ease-in-out`,
            }}
            key={mode}
          >
            <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Full Name</span>
                <input
                  type="text"
                  value={signupValues.name}
                  onChange={(e) => handleSignupChange("name", e.target.value)}
                  placeholder="Enter your name"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            )}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email address</span>
              <input
                type="email"
                value={mode === "login" ? loginValues.email : signupValues.email}
                onChange={(e) => mode === "login" ? handleLoginChange("email", e.target.value) : handleSignupChange("email", e.target.value)}
                placeholder="you@example.com"
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Password</span>
                  <div className="relative mt-3">
                    <input
                      type={mode === "login" ? (showLoginPassword ? "text" : "password") : (showSignupPassword ? "text" : "password")}
                      value={mode === "login" ? loginValues.password : signupValues.password}
                      onChange={(e) => (mode === "login" ? handleLoginChange("password", e.target.value) : handleSignupChange("password", e.target.value))}
                      placeholder={mode === "login" ? "Enter your password" : "Create a strong password"}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => mode === "login" ? setShowLoginPassword(!showLoginPassword) : setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {(mode === "login" ? showLoginPassword : showSignupPassword) ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>

                {mode === "signup" && (
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Confirm password</span>
                    <div className="relative mt-3">
                      <input
                        type={showSignupConfirmPassword ? "text" : "password"}
                        value={signupValues.confirmPassword}
                        onChange={(e) => handleSignupChange("confirmPassword", e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showSignupConfirmPassword ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </label>
                )}
              </>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || !isFirebaseConfigured}
              className={`w-full rounded-2xl py-3 text-base font-semibold text-white shadow-lg shadow-sky-200/40 transition ${
                loading || !isFirebaseConfigured
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-sky-600 hover:brightness-110"
              }`}
            >
              {loading ? "Working..." : !isFirebaseConfigured ? "Auth disabled" : submitButtonLabel}
            </button>
          </form>
          </div>

          {mode === "login" && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || !isFirebaseConfigured}
                className="text-sm text-indigo-600 hover:text-indigo-800 disabled:text-slate-400"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || !isFirebaseConfigured}
            className={`mt-4 w-full rounded-2xl border px-4 py-3 text-base font-semibold transition flex items-center justify-center gap-2 ${
              loading || !isFirebaseConfigured
                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"
            }`}
          >
            <img src={googleLogo} alt="Google" style={{height: '20px', width: '20px'}} />

            {loading ? "Please wait..." : !isFirebaseConfigured ? "Google login unavailable" : "Continue with Google"}
          </button>

          <div className="mt-6 rounded-3xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
            {mode === "login"
              ? "New to NEET Prep? Switch to Sign Up to create an account."
              : "Already have an account? Switch to Login to continue."}
          </div>
        </div>
      </div>
    </div>
  );
}
