import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { auth, db, isFirebaseConfigured } from "./firebase";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { syllabus } from "./data/syllabus";
import { generateQuestions } from "./utils/generateQuestions";
import HomeScreen from "./pages/HomeScreen";
import Dashboard from "./pages/Dashboard";
import TestScreen from "./pages/TestScreen";
import TestSetup from "./pages/TestSetup";
import Result from "./pages/Result";
import SelectChapters from "./pages/SelectChapters";

const subjectsData = syllabus;

// =========================
// HEADER
// =========================
function Header({ user, onLogout, isTestRunning, onUpdateProfile }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [profileData, setProfileData] = useState({
    dob: "",
    phone: "",
    address: "",
    dobEdited: false,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const dropdownRef = useRef(null);

  // Load user profile data on mount
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.uid || !isFirebaseConfigured) return;
      try {
        const docRef = doc(db, "userProfiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const profile = docSnap.data();
          setProfileData({
            dob: profile.dob || "",
            phone: profile.phone || user.phone || "",
            address: profile.address || "",
            dobEdited: profile.dobEdited || false,
          });
        } else {
          setProfileData({
            dob: "",
            phone: user.phone || "",
            address: "",
            dobEdited: false,
          });
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
      }
    };
    loadProfileData();
  }, [user?.uid]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpdateProfile = async () => {
    if (!user?.uid) return;
    
    setIsUpdating(true);
    setPhoneError("");

    try {
      // Validate DOB - can only be edited once
      if (profileData.dob && profileData.dobEdited && profileData.dob !== (profileData.dob || "")) {
        setPhoneError("Date of Birth can only be edited once");
        setIsUpdating(false);
        return;
      }

      // Validate DOB - not future date and age >= 12
      if (profileData.dob) {
        const dobDate = new Date(profileData.dob);
        const today = new Date();
        const age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate()) ? age - 1 : age;

        if (dobDate > today) {
          setPhoneError("Date of Birth cannot be in the future");
          setIsUpdating(false);
          return;
        }
        if (actualAge < 12) {
          setPhoneError("You must be at least 12 years old");
          setIsUpdating(false);
          return;
        }
      }

      // Save to Firestore
      if (!db) {
        throw new Error("Firestore instance is not available");
      }
      const docRef = doc(db, "userProfiles", user.uid);
      await setDoc(docRef, {
        uid: user.uid,
        name: user.name || "",
        email: user.email || "",
        ...profileData,
        dobEdited: profileData.dob ? true : profileData.dobEdited,
        updatedAt: new Date(),
      }, { merge: true });

      console.log("✓ Profile updated successfully");
      setShowUpdateModal(false);
      setShowDropdown(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setPhoneError(error.message || "Failed to update profile. Please check your permissions.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <header style={{
      background: "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)",
      padding: "0",
      boxShadow: "0 2px 8px rgba(30,64,175,0.15)",
      position: "sticky",
      top: 0,
      zIndex: 1100,
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "0 1rem",
        display: "flex",
        alignItems: "center",
        minHeight: "64px",
        flexWrap: "wrap",
        gap: "12px",
      }}>
        {/* Logo Icon */}
        <div style={{
          width: "40px",
          height: "40px",
          background: "rgba(255,255,255,0.15)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: "1.5px solid rgba(255,255,255,0.25)",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity="0.9"/>
            <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
            <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Brand Name */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}>
          <span style={{
            color: "#ffffff",
            fontWeight: "700",
            fontSize: "clamp(16px, 3vw, 22px)",
            letterSpacing: "0.3px",
            lineHeight: 1,
          }}>
            NEET
          </span>
          <span style={{
            color: "rgba(255,255,255,0.75)",
            fontWeight: "400",
            fontSize: "clamp(16px, 3vw, 22px)",
            letterSpacing: "0.3px",
            lineHeight: 1,
          }}>
            Prep
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User Profile Section */}
        {user && !isTestRunning && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "14px",
              fontWeight: "500",
            }}>
              {user.name ? user.name.split(' ')[0] : 'User'}
            </span>
            <div style={{ position: "relative" }} ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: "999px",
                  width: "40px",
                  height: "40px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  hover: {
                    background: "rgba(255,255,255,0.25)",
                  }
                }}
                title={user.name}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M12 14c-6 0-8 3-8 3v7h16v-7s-2-3-8-3z"/>
                </svg>
              </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "8px",
                background: "white",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                minWidth: "200px",
                zIndex: 1000,
                overflow: "hidden",
              }}>
                {/* User Info */}
                <div style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #e5e7eb",
                  background: "#f9fafb",
                }}>
                  <p style={{
                    fontSize: "13px",
                    color: "#667eea",
                    fontWeight: "500",
                    margin: "0 0 4px 0",
                  }}>
                    Logged in as
                  </p>
                  <p style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1f2937",
                    margin: "0 0 2px 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {user.name}
                  </p>
                  <p style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "0",
                  }}>
                    {user.email}
                  </p>
                </div>

                {/* Menu Items */}
                <button
                  onClick={() => {
                    setShowUpdateModal(true);
                    setNewName(user.name);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "white",
                    textAlign: "left",
                    cursor: "pointer",
                    color: "#374151",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => e.target.style.background = "#f3f4f6"}
                  onMouseLeave={(e) => e.target.style.background = "white"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Update Profile
                </button>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onLogout();
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "white",
                    textAlign: "left",
                    cursor: "pointer",
                    color: "#ef4444",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background 0.2s ease",
                    borderTop: "1px solid #e5e7eb",
                  }}
                  onMouseEnter={(e) => e.target.style.background = "#fef2f2"}
                  onMouseLeave={(e) => e.target.style.background = "white"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4M16 17l5-5m0 0l-5-5m5 5H9"/>
                  </svg>
                  Logout
                </button>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Update Profile Modal */}
      {showUpdateModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 20px 25px rgba(0,0,0,0.1)",
            padding: "24px",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "90vh",
            overflow: "auto",
          }}>
            <h2 style={{
              fontSize: "22px",
              fontWeight: "600",
              marginBottom: "20px",
              color: "#1f2937",
            }}>
              Update Profile
            </h2>

            <>
              {/* Name Field - Disabled */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#6b7280",
                  marginBottom: "6px",
                }}>
                  Name (Cannot be changed)
                </label>
                <input
                  type="text"
                  value={user?.name || ""}
                  disabled
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    background: "#f9fafb",
                    color: "#6b7280",
                  }}
                />
              </div>

              {/* Email Field - Disabled */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#6b7280",
                  marginBottom: "6px",
                }}>
                  Email (Cannot be changed)
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    background: "#f9fafb",
                    color: "#6b7280",
                  }}
                />
              </div>

              {/* Date of Birth - Editable once */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#6b7280",
                  marginBottom: "6px",
                }}>
                  Date of Birth {profileData.dobEdited && "(Cannot be changed again)"}
                </label>
                <input
                  type="date"
                  value={profileData.dob}
                  onChange={(e) => {
                    if (!profileData.dobEdited) {
                      setProfileData({ ...profileData, dob: e.target.value });
                    }
                  }}
                  disabled={profileData.dobEdited}
                  max={new Date().toISOString().split('T')[0]} // Prevent future dates
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    background: profileData.dobEdited ? "#f9fafb" : "white",
                    color: profileData.dobEdited ? "#6b7280" : "#1f2937",
                  }}
                />
              </div>

              {/* Phone Number */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#6b7280",
                  marginBottom: "6px",
                }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Address */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#6b7280",
                  marginBottom: "6px",
                }}>
                  Address
                </label>
                <textarea
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  placeholder="Enter your address"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    minHeight: "80px",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {phoneError && (
                <div style={{
                  marginBottom: "16px",
                  padding: "10px 12px",
                  background: "#fee2e2",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  color: "#991b1b",
                  fontSize: "13px",
                }}>
                  {phoneError}
                </div>
              )}

              <div style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setPhoneError("");
                  }}
                  disabled={isUpdating}
                  style={{
                    padding: "10px 16px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#374151",
                    fontWeight: "500",
                    opacity: isUpdating ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProfile}
                  disabled={isUpdating}
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "6px",
                    background: "#667eea",
                    color: "white",
                    cursor: isUpdating ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    opacity: isUpdating ? 0.5 : 1,
                  }}
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </>
          </div>
        </div>
      )}
    </header>
  );
}

// =========================
// LAYOUT WRAPPER
// =========================
function Layout({ children, user, onLogout, isTestRunning, onUpdateProfile }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#f8fafc",
    }}>
      <Header
        user={user}
        onLogout={onLogout}
        isTestRunning={isTestRunning}
        onUpdateProfile={onUpdateProfile}
      />
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}

// =========================
// APP
// =========================
export default function App() {
  const [step, setStep] = useState("checking-auth");
  const [user, setUser] = useState(null);

  const [selected, setSelected] = useState({
    Biology: [],
    Chemistry: [],
    Physics: []
  });

  useEffect(() => {
    if (!auth) {
      setStep("home");
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          name: firebaseUser.displayName || "NEET Student",
          email: firebaseUser.email || "",
          uid: firebaseUser.uid,
        });
        setStep("dashboard");
      } else {
        setUser(null);
        setStep("home");
      }
    });
    return unsubscribe;
  }, []);


  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  const handleChaptersNext = (flatSelected) => {
    const rebuilt = { Biology: [], Chemistry: [], Physics: [] };
    Object.entries(subjectsData).forEach(([subject, classes]) => {
      Object.values(classes).forEach((chapters) => {
        chapters.forEach((ch) => {
          if (flatSelected.includes(ch)) rebuilt[subject].push(ch);
        });
      });
    });
    setSelected(rebuilt);
    setStep("setup");
  };

  const startTest = async (counts) => {
    setStep("loading");
    let allQuestions = [];
    for (const subject of Object.keys(selected)) {
      if (selected[subject].length && counts[subject] > 0) {
        const qs = await generateQuestions(
          selected[subject],
          counts[subject],
          subject
        );
        allQuestions.push(...qs);
      }
    }
    setQuestions(allQuestions);
    setStep("test");
  };

  const handleRestart = () => {
    setStep("dashboard");
    setQuestions([]);
    setAnswers({});
    setSelected({ Biology: [], Chemistry: [], Physics: [] });
  };

  const handleAuthSuccess = ({ name, email, uid, phone }) => {
    setUser({ name, email, uid, phone });
    setStep("dashboard");
  };

  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Firebase logout failed:", error);
      }
    }
    setUser(null);
    setStep("home");
  };

  const handleUpdateProfile = (newName) => {
    setUser(prev => ({ ...prev, name: newName }));
  };

  // =========================
  // AUTH CHECKING
  // =========================
  if (step === "checking-auth") {
    return (
      <Layout user={user} onLogout={handleLogout} isTestRunning={false} onUpdateProfile={handleUpdateProfile}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
          <div className="text-center">
            <div className="inline-block mb-4">
              <div className="w-12 h-12 border-3 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-500 text-sm">Verifying session...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // =========================
  // LOADING
  // =========================
  if (step === "loading") {
    return (
      <Layout user={user} onLogout={handleLogout} isTestRunning={false} onUpdateProfile={handleUpdateProfile}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-700">Generating Questions...</h2>
            <p className="text-gray-500 mt-2">Please wait while we prepare your test</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (step === "home") {
    return (
      <Layout user={user} onLogout={handleLogout} isTestRunning={false} onUpdateProfile={handleUpdateProfile}>
        <HomeScreen onAuthSuccess={handleAuthSuccess} />
      </Layout>
    );
  }

  if (step === "dashboard") {
    return (
      <Layout user={user} onLogout={handleLogout} isTestRunning={false} onUpdateProfile={handleUpdateProfile}>
        <Dashboard
          user={user}
          onStartTest={() => setStep("select")}
        />
      </Layout>
    );
  }

  if (step === "select") {
    return (
      <Layout user={user} onLogout={handleLogout} isTestRunning={false} onUpdateProfile={handleUpdateProfile}>
        <SelectChapters onNext={handleChaptersNext} onBack={() => setStep("dashboard")} />
      </Layout>
    );
  }

  if (step === "setup") {
    return (
      <Layout user={user} onLogout={handleLogout} isTestRunning={false} onUpdateProfile={handleUpdateProfile}>
        <TestSetup
          selectedChapters={selected}
          onStart={startTest}
          onBack={() => setStep("select")}
        />
      </Layout>
    );
  }

  if (step === "test") {
    return (
      <Layout user={user} onLogout={handleLogout} isTestRunning={true} onUpdateProfile={handleUpdateProfile}>
        <TestScreen
          questions={questions}
          onSubmit={(userAnswers) => {
            setAnswers(userAnswers);
            setStep("result");
          }}
        />
      </Layout>
    );
  }

  if (step === "result") {
    return (
      <Layout user={user} onLogout={handleLogout} isTestRunning={false} onUpdateProfile={handleUpdateProfile}>
        <Result
          questions={questions}
          answers={answers}
          user={user}
          onRestart={handleRestart}
        />
      </Layout>
    );
  }
}