import { useState, useEffect, useMemo } from "react";

export default function TestScreen({ questions, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [current, setCurrent] = useState(0);
  const [time, setTime] = useState(questions.length * 60);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showSubjectDrop, setShowSubjectDrop] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => { onSubmit(answers); }, 1200);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (time === 240) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 4000);
    }
  }, [time]);

  useEffect(() => {
    if (!showSubjectDrop) return;
    const close = () => setShowSubjectDrop(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showSubjectDrop]);

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const q = questions[current] || { question: "", options: [] };

  const sections = useMemo(() => {
    const map = {};
    questions.forEach((q, i) => {
      const subject = q.section;
      if (!map[subject]) map[subject] = { start: i, count: 0, questions: [] };
      map[subject].count++;
      map[subject].questions.push(i);
    });
    return map;
  }, [questions]);

  const currentSection = q.section;
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.keys(marked).filter(k => marked[k]).length;

  const handleAnswer = (opt) => {
    setAnswers((prev) => {
      if (prev[current] === opt) {
        const updated = { ...prev };
        delete updated[current];
        return updated;
      }
      return { ...prev, [current]: opt };
    });
  };

  const toggleMark = () => {
    setMarked((prev) => ({ ...prev, [current]: !prev[current] }));
  };

  const getQuestionStatus = (i) => {
    if (current === i) return "current";
    if (marked[i]) return "marked";
    if (answers[i]) return "answered";
    return "unanswered";
  };

  const statusStyle = {
    current:    "bg-indigo-500 text-white ring-2 ring-indigo-200",
    marked:     "bg-amber-400 text-white",
    answered:   "bg-emerald-500 text-white",
    unanswered: "bg-gray-100 text-gray-500 hover:bg-gray-200",
  };

  // ── PALETTE PANEL (shared between sidebar and bottom sheet) ──
  const PaletteContent = () => (
    <div className="flex flex-col gap-4">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Answered", value: answeredCount, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Marked",   value: markedCount,   color: "text-amber-500",   bg: "bg-amber-50"   },
          { label: "Left",     value: questions.length - answeredCount, color: "text-gray-500", bg: "bg-gray-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-lg py-2`}>
            <div className={`text-lg font-bold ${color}`}>{value}</div>
            <div className="text-[10px] text-gray-400 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Per-subject grids */}
      {Object.entries(sections).map(([subject, data]) => {
        const subAnswered = data.questions.filter(i => answers[i]).length;
        return (
          <div key={subject}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-600">{subject}</span>
              <span className="text-[10px] text-gray-400">{subAnswered}/{data.count}</span>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-gray-100 rounded-full mb-2 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: `${data.count > 0 ? (subAnswered / data.count) * 100 : 0}%` }}
              />
            </div>
            <div className="grid grid-cols-6 gap-1">
              {data.questions.map((qi) => (
                <button
                  key={qi}
                  onClick={() => { setCurrent(qi); setShowPalette(false); }}
                  className={`${statusStyle[getQuestionStatus(qi)]} rounded text-[11px] font-semibold aspect-square flex items-center justify-center transition`}
                >
                  {qi + 1}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1 border-t border-gray-100">
        {[
          { cls: "bg-emerald-500", label: "Answered" },
          { cls: "bg-amber-400",  label: "Marked"   },
          { cls: "bg-indigo-500",  label: "Current"  },

        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`${cls} w-2.5 h-2.5 rounded-sm flex-shrink-0`} />
            <span className="text-[11px] text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex bg-gray-50" style={{ height: "calc(100vh - 64px)" }}>

      {/* WARNING TOAST */}
      {showWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-semibold animate-bounce">
          ⚠️ Only 4 minutes left!
        </div>
      )}

      {/* ── LEFT PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOP BAR */}
        <div className="px-3 py-2 bg-white flex items-center sticky top-0 z-10 border-b border-gray-100 shadow-sm">

          {/* ── TIMER (always left) ── */}
          <div className={`flex items-center gap-1 font-bold tabular-nums rounded-md px-2.5 py-1 text-xs sm:text-sm flex-shrink-0 ${
            time <= 240 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
          }`}>
            ⏱ {formatTime(time)}
          </div>

          {/* ── Q COUNTER (center) ── */}
          <div className="flex-1 flex justify-center items-center gap-0.5 text-sm text-gray-400">
            <span className="font-bold text-gray-800 text-base">{current + 1}</span>
            <span className="text-gray-400 text-sm">/ {questions.length}</span>
          </div>

          {/* ── RIGHT SIDE — custom dropdown for ALL screen sizes ── */}
          <div className="flex items-center gap-2 flex-shrink-0 relative">

            {/* Subject pill trigger */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowSubjectDrop(v => !v); }}
              className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs pl-3 pr-2.5 py-1.5 rounded-full hover:bg-indigo-100 transition"
            >
              <span>{currentSection}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                style={{ transform: showSubjectDrop ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s" }}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Dropdown panel */}
            {showSubjectDrop && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[180px]">
                {Object.entries(sections).map(([sub, data]) => {
                  const isActive = currentSection === sub;
                  const subAnswered = data.questions.filter(i => answers[i]).length;
                  const pct = Math.round((subAnswered / data.count) * 100);
                  return (
                    <button
                      key={sub}
                      onClick={() => { setCurrent(data.start); setShowSubjectDrop(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition border-b border-gray-50 last:border-0 ${
                        isActive ? "bg-indigo-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex-1 mr-3">
                        <div className={`text-xs font-semibold mb-1 ${isActive ? "text-indigo-700" : "text-gray-700"}`}>{sub}</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">{subAnswered}/{data.count}</span>
                        </div>
                      </div>
                      {isActive && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Grid button — mobile only */}
            <button
              onClick={() => setShowPalette(true)}
              className="md:hidden flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
          </div>

        </div>

        {/* QUESTION AREA */}
        <div className="flex-1 px-4 py-5 sm:px-6 overflow-y-auto">
          <p className="font-semibold text-sm sm:text-base mb-4 leading-relaxed text-gray-800">
            {current + 1}. {q.question}
          </p>

          <div className="space-y-2.5">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(opt)}
                className={`flex items-center gap-3 border px-4 py-2.5 w-full text-left rounded-xl text-sm transition
                  ${answers[current] === opt
                    ? "bg-indigo-50 border-indigo-400 text-indigo-800 font-semibold shadow-sm"
                    : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                  }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  answers[current] === opt ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            ))}
          </div>

          {/* NAV + MARK */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-25 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Prev
            </button>

            <button
              onClick={toggleMark}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                marked[current]
                  ? "bg-amber-400 text-white"
                  : "bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={marked[current] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                <path d="M5 3h14a1 1 0 011 1v17l-7-3-7 3V4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {marked[current] ? "Marked" : "Mark"}
            </button>

            <button
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              disabled={current === questions.length - 1}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-25 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 transition"
            >
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

        {/* SUBMIT ROW */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white sticky bottom-0 flex items-center justify-between gap-3">

          <button
            onClick={() => setShowConfirm(true)}
            className="sm:w-auto w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Submit Test
          </button>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR (md+) ── */}
      <div className="w-56 bg-white border-l border-gray-100 px-4 py-4 overflow-y-auto hidden md:flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Overview</h3>
        </div>
        <PaletteContent />
      </div>

      {/* ── MOBILE BOTTOM SHEET ── */}
      {showPalette && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowPalette(false)} />
          {/* sheet */}
          <div className="relative bg-white rounded-t-2xl p-5 max-h-[75vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700">Question Overview</h3>
              <button
                onClick={() => setShowPalette(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
            <PaletteContent />
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-xs text-center">
            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h2 className="text-base font-bold mb-1 text-gray-800">Submit Test?</h2>
            <p className="text-gray-400 text-sm mb-5">
              <span className="text-emerald-600 font-semibold">{answeredCount}</span> of {questions.length} answered
              <br /><span className="text-xs">Unattempted questions will score 0.</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition">
                Cancel
              </button>
              <button onClick={() => { setShowConfirm(false); handleSubmit(); }} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOADER */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="font-semibold text-gray-600 text-sm">Evaluating Results...</p>
          </div>
        </div>
      )}
    </div>
  );
}