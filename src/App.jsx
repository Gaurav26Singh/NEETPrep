import { useState } from "react";
import { syllabus } from "./data/syllabus";
import { generateQuestions } from "./utils/generateQuestions";
import TestScreen from "./pages/TestScreen";
import TestSetup from "./pages/TestSetup";
import Result from "./pages/Result";
import SelectChapters from "./pages/SelectChapters";

const subjectsData = syllabus;

// =========================
// HEADER
// =========================
function Header() {
  return (
    <header style={{
      background: "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)",
      padding: "0",
      boxShadow: "0 2px 8px rgba(30,64,175,0.15)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "0 1rem",
        display: "flex",
        alignItems: "center",
        height: "64px",
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
        <div>
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
            marginLeft: "6px",
            letterSpacing: "0.3px",
            lineHeight: 1,
          }}>
            Prep
          </span>
          <div style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: "11px",
            marginTop: "2px",
            letterSpacing: "0.5px",
          }}>
            Biology · Chemistry · Physics
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Badge */}
      </div>
    </header>
  );
}

// =========================
// LAYOUT WRAPPER
// =========================
function Layout({ children }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#f8fafc",
    }}>
      <Header />
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
  const [step, setStep] = useState("select");

  const [selected, setSelected] = useState({
    Biology: [],
    Chemistry: [],
    Physics: []
  });

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  const toggleChapter = (subject, chapter) => {
    setSelected((prev) => ({
      ...prev,
      [subject]: prev[subject].includes(chapter)
        ? prev[subject].filter((c) => c !== chapter)
        : [...prev[subject], chapter]
    }));
  };

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
    setStep("select");
    setQuestions([]);
    setAnswers({});
    setSelected({ Biology: [], Chemistry: [], Physics: [] });
  };

  // =========================
  // LOADING
  // =========================
  if (step === "loading") {
    return (
      <Layout>
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

  if (step === "select") {
    return (
      <Layout>
        <SelectChapters onNext={handleChaptersNext} />
      </Layout>
    );
  }

  if (step === "setup") {
    return (
      <Layout>
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
      <Layout>
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
      <Layout>
        <Result
          questions={questions}
          answers={answers}
          onRestart={handleRestart}
        />
      </Layout>
    );
  }
}