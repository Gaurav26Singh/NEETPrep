import { useState } from "react";

export default function TestSetup({ selectedChapters, onStart, onBack }) {
  const [counts, setCounts] = useState({
    Biology: 10,
    Chemistry: 10,
    Physics: 10
  });

  const handleChange = (subject, value) => {
    setCounts((prev) => ({
      ...prev,
      [subject]: Math.max(0, Number(value))
    }));
  };

  const subjects = Object.keys(selectedChapters).filter(
    (s) => selectedChapters[s].length > 0
  );

  const totalQuestions = subjects.reduce(
    (sum, s) => sum + counts[s],
    0
  );

  const totalTime = totalQuestions;

  // =========================
  // ✅ NEW VALIDATION (MIN 5)
  // =========================
  const isValid =
    subjects.length > 0 &&
    subjects.every((s) => counts[s] >= 5);

  const colors = {
    Biology: "bg-green-500",
    Chemistry: "bg-blue-500",
    Physics: "bg-purple-500"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-blue-100 p-4 md:p-10">

      {/* HEADER */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-800">
          ⚙️ Setup Your Test
        </h1>
        <p className="text-gray-500 mt-2">
          Customize questions before starting
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* LEFT - SUBJECTS */}
        <div className="lg:col-span-2 space-y-6">

          {subjects.map((subject) => (
            <div
              key={subject}
              className="bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl rounded-2xl p-6 hover:scale-[1.01] transition"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{subject}</h2>
                <span
                  className={`text-white text-xs px-3 py-1 rounded-full ${colors[subject]}`}
                >
                  {selectedChapters[subject].length} Chapters
                </span>
              </div>

              {/* STEPPER INPUT */}
              <div className="flex items-center justify-between">

                <span className="text-gray-600">
                  Number of Questions
                </span>

                <div className="flex items-center gap-3">

                  <button
                    onClick={() =>
                      handleChange(subject, counts[subject] - 1)
                    }
                    className="w-8 h-8 bg-gray-200 rounded-full"
                  >
                    -
                  </button>

                  <span className="text-xl font-bold w-10 text-center">
                    {counts[subject]}
                  </span>

                  <button
                    onClick={() =>
                      handleChange(subject, counts[subject] + 1)
                    }
                    className="w-8 h-8 bg-gray-200 rounded-full"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT - SUMMARY */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-6 flex flex-col justify-between">

          <div>
            <h2 className="text-xl font-bold mb-6">
              📊 Test Summary
            </h2>

            <div className="mb-6">
              <p className="text-gray-500">Total Questions</p>
              <h3 className="text-4xl font-bold text-blue-600">
                {totalQuestions}
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-500">Total Time</p>
              <h3 className="text-3xl font-bold">
                {totalTime} min
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">
                Completion
              </p>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(totalQuestions * 2, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="space-y-3 mt-6">

            <button
              onClick={onBack}
              className="w-full bg-gray-200 py-3 rounded-lg hover:bg-gray-300"
            >
              ← Back
            </button>

            <button
              disabled={!isValid}
              onClick={() => onStart(counts)}
              className={`w-full py-3 rounded-lg text-white font-bold transition
                ${
                  isValid
                    ? "bg-gradient-to-r from-green-500 to-green-600 hover:scale-105"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
            >
              🚀 Start Test
            </button>
          </div>

          {/* 🔥 UPDATED ERROR MESSAGE */}
          {!isValid && (
            <p className="text-red-500 text-sm text-center mt-2">
              Minimum 5 questions required per subject
            </p>
          )}
        </div>
      </div>
    </div>
  );
}