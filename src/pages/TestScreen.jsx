import { useState, useEffect, useMemo } from "react";

export default function TestScreen({ questions, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [current, setCurrent] = useState(0);
  const [time, setTime] = useState(questions.length * 60);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [loading, setLoading] = useState(false);

  // =========================
  // ✅ SUBMIT HANDLER (COMMON)
  // =========================
  const handleSubmit = () => {
    setLoading(true);

    setTimeout(() => {
      onSubmit(answers);
    }, 1200);
  };

  // =========================
  // ⏱ TIMER (FIXED AUTO SUBMIT)
  // =========================
  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // =========================
  // ⚠️ WARNING AT 4 MIN
  // =========================
  useEffect(() => {
    if (time === 240) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 4000);
    }
  }, [time]);

  // =========================
  // FORMAT TIME
  // =========================
  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const q = questions[current] || { question: "", options: [] };

  // =========================
  // SECTIONS
  // =========================
  const sections = useMemo(() => {
    const map = {};
    questions.forEach((q, i) => {
      const subject = q.section;
      if (!map[subject]) {
        map[subject] = { start: i, count: 0 };
      }
      map[subject].count++;
    });
    return map;
  }, [questions]);

  const currentSection = q.section;

  // =========================
  // ✅ FIXED HANDLE ANSWER (TOGGLE)
  // =========================
  const handleAnswer = (opt) => {
    setAnswers((prev) => {
      // if same option clicked → remove
      if (prev[current] === opt) {
        const updated = { ...prev };
        delete updated[current];
        return updated;
      }

      // otherwise select
      return {
        ...prev,
        [current]: opt
      };
    });
  };

  const toggleMark = () => {
    setMarked((prev) => ({
      ...prev,
      [current]: !prev[current]
    }));
  };

  return (
    <div className="flex h-screen bg-gray-50">

      {/* ⚠️ WARNING */}
      {showWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          ⚠️ Only 4 minutes left!
        </div>
      )}

      {/* LEFT */}
      <div className="flex-1 flex flex-col">

        {/* TOP BAR */}
        <div className="p-4 shadow bg-white flex justify-between items-center sticky top-0 z-10">

          <h2
            className={`text-xl font-bold transition
              ${time <= 240 ? "text-red-500" : "text-blue-600"}
            `}
          >
            ⏱ {formatTime(time)}
          </h2>

          <select
            value={currentSection}
            onChange={(e) =>
              setCurrent(sections[e.target.value].start)
            }
            className="border px-3 py-1 rounded-lg shadow-sm"
          >
            {Object.entries(sections).map(([sub, data]) => (
              <option key={sub} value={sub}>
                {sub} ({data.count})
              </option>
            ))}
          </select>
        </div>

        {/* QUESTION */}
        <div className="flex-1 p-6 overflow-y-auto">
          <p className="font-semibold text-lg mb-4">
            {current + 1}. {q.question}
          </p>

          {q.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(opt)}
              className={`block border px-4 py-2 mt-2 w-full text-left rounded-lg
                ${
                  answers[current] === opt
                    ? "bg-blue-200"
                    : "hover:bg-gray-100"
                }`}
            >
              {opt}
            </button>
          ))}

          <div className="mt-6 flex gap-3 flex-wrap">

            <button
              onClick={toggleMark}
              className="bg-yellow-400 px-4 py-2 rounded-lg"
            >
              {marked[current] ? "Unmark" : "Mark for Review"}
            </button>

            <button
              onClick={() =>
                setCurrent((c) => Math.max(0, c - 1))
              }
              className="bg-gray-300 px-4 py-2 rounded-lg"
            >
              Previous
            </button>

            {current !== questions.length - 1 && (
              <button
                onClick={() => setCurrent((c) => c + 1)}
                className="bg-gray-300 px-4 py-2 rounded-lg"
              >
                Next
              </button>
            )}
          </div>
        </div>

        {/* SUBMIT */}
        <div className="p-4 border-t bg-white sticky bottom-0">
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-red-500 text-white px-6 py-3 rounded-lg w-full font-bold"
          >
            Submit Test
          </button>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-64 bg-white border-l p-4 overflow-y-auto hidden md:block">
        <h3 className="font-bold mb-4 text-gray-700">Questions</h3>

        <div className="grid grid-cols-5 gap-2">
          {questions.map((_, i) => {
            let bg = "bg-gray-100";
            if (answers[i]) bg = "bg-green-400";
            if (marked[i]) bg = "bg-yellow-400";
            if (current === i) bg = "bg-blue-400";

            return (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`${bg} p-2 rounded text-sm`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="mt-6 text-sm space-y-2">
          <p><span className="bg-green-400 px-2 mr-2"></span> Answered</p>
          <p><span className="bg-yellow-400 px-2 mr-2"></span> Marked</p>
          <p><span className="bg-blue-400 px-2 mr-2"></span> Current</p>
        </div>
      </div>

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80 text-center">

            <h2 className="text-lg font-bold mb-4">
              Submit Test?
            </h2>

            <p className="text-gray-600 mb-6">
              Are you sure you want to submit?
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  handleSubmit();
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-lg"
              >
                Yes
              </button>

              <button
                onClick={() => setShowConfirm(false)}
                className="bg-gray-300 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* LOADER */}
      {loading && (
        <div className="fixed inset-0 bg-white/70 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-semibold text-gray-700">
              Evaluating Results...
            </p>
          </div>
        </div>
      )}

    </div>
  );
}