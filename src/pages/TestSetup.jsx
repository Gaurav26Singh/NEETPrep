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
  // Calculation for Total Marks
  const totalMarks = totalQuestions * 4;

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
      <div className="text-center mb-6 md:mb-8">
        <h1 className="text-2xl md:text-5xl font-bold text-gray-800">
          ⚙️ Setup Your Test
        </h1>
        <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">
          Customize questions before starting
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* LEFT - SUBJECTS */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {subjects.map((subject) => (
            <div
              key={subject}
              className="bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl rounded-2xl p-5 md:p-6 hover:scale-[1.01] transition"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-bold">{subject}</h2>
                <span
                  className={`text-white text-[10px] md:text-xs px-2 py-0.5 md:px-3 md:py-1 rounded-full ${colors[subject]}`}
                >
                  {selectedChapters[subject].length} Chapters
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm md:text-base text-gray-600">
                  Number of Questions
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleChange(subject, counts[subject] - 1)}
                    className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center active:bg-gray-300"
                  >
                    -
                  </button>
                  <span className="text-lg md:text-xl font-bold w-8 md:w-10 text-center">
                    {counts[subject]}
                  </span>
                  <button
                    onClick={() => handleChange(subject, counts[subject] + 1)}
                    className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center active:bg-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT - SUMMARY */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg md:text-xl font-bold">📊 Test Summary</h2>
              {/* Marking Scheme Info Badge */}
              <div className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded border border-orange-200">
                +4 | -1
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="mb-2 md:mb-6">
                <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wide">Questions</p>
                <h3 className="text-2xl md:text-4xl font-bold text-blue-600">
                  {totalQuestions}
                </h3>
              </div>

              <div className="mb-2 md:mb-6">
                <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wide">Total Marks</p>
                <h3 className="text-2xl md:text-4xl font-bold text-orange-600">
                  {totalMarks}
                </h3>
              </div>
            </div>

            <div className="mb-4 md:mb-6 border-t border-gray-100 pt-4">
              <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wide">Duration</p>
              <h3 className="text-xl md:text-3xl font-bold">
                {totalTime} <span className="text-sm md:text-lg font-medium text-gray-500">min</span>
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Target Intensity</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(totalQuestions * 2, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="space-y-3 mt-4">
            <button
              onClick={onBack}
              className="w-full bg-gray-200 py-2.5 md:py-3 rounded-lg hover:bg-gray-300 text-sm md:text-base font-medium"
            >
              ← Back
            </button>

            <button
              disabled={!isValid}
              onClick={() => onStart(counts)}
              className={`w-full py-2.5 md:py-3 rounded-lg text-white font-bold text-sm md:text-base transition
                ${
                  isValid
                    ? "bg-gradient-to-r from-green-500 to-green-600 hover:scale-105 active:scale-95"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
            >
              🚀 Start Test
            </button>
          </div>

          {!isValid && (
            <p className="text-red-500 text-[11px] md:text-sm text-center mt-3 italic">
              * Minimum 5 questions required per subject
            </p>
          )}
        </div>
      </div>
    </div>
  );
}