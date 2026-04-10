import { useState, useMemo } from "react";
import { syllabus } from "../data/syllabus";

const SUBJECT_COLORS = [
  { accent: "#6366f1", light: "#eef2ff", border: "#c7d2fe", dark: "#4338ca" },
  { accent: "#0ea5e9", light: "#e0f2fe", border: "#bae6fd", dark: "#0369a1" },
  { accent: "#10b981", light: "#d1fae5", border: "#a7f3d0", dark: "#047857" },
  { accent: "#f59e0b", light: "#fef3c7", border: "#fde68a", dark: "#b45309" },
  { accent: "#ec4899", light: "#fce7f3", border: "#fbcfe8", dark: "#be185d" },
  { accent: "#8b5cf6", light: "#ede9fe", border: "#c4b5fd", dark: "#6d28d9" },
];

export default function SelectChapters({ onNext, onBack }) {
  const [selected, setSelected] = useState([]);
  const [expandedSubjects, setExpandedSubjects] = useState(() => {
    const init = {};
    Object.keys(syllabus).forEach((s) => (init[s] = true));
    return init;
  });
  const [search, setSearch] = useState("");

  // Create unique identifier for each chapter: subject|class|chapterName
  const makeChapterId = (subject, cls, chapter) => `${subject}|${cls}|${chapter}`;
  const parseChapterId = (id) => {
    const [subject, cls, ...rest] = id.split('|');
    return { subject, cls, chapter: rest.join('|') };
  };

  const toggle = (subject, cls, chapter) => {
    const id = makeChapterId(subject, cls, chapter);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleSubject = (subject) => {
    setExpandedSubjects((prev) => ({ ...prev, [subject]: !prev[subject] }));
  };

  const allChapterIds = useMemo(() => {
    const all = [];
    Object.entries(syllabus).forEach(([subject, classes]) =>
      Object.entries(classes).forEach(([cls, chapters]) =>
        chapters.forEach((ch) => all.push(makeChapterId(subject, cls, ch)))
      )
    );
    return all;
  }, []);

  const selectAll = () => setSelected([...allChapterIds]);
  const clearAll = () => setSelected([]);

  const selectSubject = (subject) => {
    const chapterIds = [];
    Object.entries(syllabus[subject]).forEach(([cls, chapters]) =>
      chapters.forEach((ch) => chapterIds.push(makeChapterId(subject, cls, ch)))
    );
    const allSelected = chapterIds.every((id) => selected.includes(id));
    if (allSelected) {
      setSelected((prev) => prev.filter((c) => !chapterIds.includes(c)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...chapterIds])]);
    }
  };

  const filteredSyllabus = useMemo(() => {
    if (!search.trim()) return syllabus;
    const q = search.toLowerCase();
    const result = {};
    Object.entries(syllabus).forEach(([subject, classes]) => {
      const filteredClasses = {};
      Object.entries(classes).forEach(([cls, chapters]) => {
        const matched = chapters.filter((ch) => ch.toLowerCase().includes(q));
        if (matched.length > 0) filteredClasses[cls] = matched;
      });
      if (Object.keys(filteredClasses).length > 0) result[subject] = filteredClasses;
    });
    return result;
  }, [search]);

  const handleContinue = () => {
    // Extract just the chapter names from the selected IDs for backward compatibility
    const chapterNames = selected.map(id => parseChapterId(id).chapter);
    onNext(chapterNames);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        .sc-root {
          min-height: 100vh;
          background: #f5f6fa;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* ── HEADER ── */
        .sc-header {
          background: #ffffff;
          border-bottom: 1px solid #e9eaf0;
          padding: 16px 20px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 6px rgba(0,0,0,0.06);
        }

        .sc-header-inner {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sc-title {
          font-size: 17px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          white-space: nowrap;
          letter-spacing: -0.2px;
        }

        .sc-search-wrap {
          flex: 1;
          min-width: 160px;
          position: relative;
        }

        .sc-search-icon {
          position: absolute;
          left: 11px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          width: 15px;
          height: 15px;
          pointer-events: none;
        }

        .sc-search {
          width: 100%;
          background: #f5f6fa;
          border: 1px solid #e9eaf0;
          border-radius: 8px;
          padding: 8px 12px 8px 34px;
          color: #111827;
          font-size: 13.5px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .sc-search::placeholder { color: #9ca3af; }
        .sc-search:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
          background: #fff;
        }

        .sc-btn-ghost {
          background: #fff;
          border: 1px solid #e9eaf0;
          border-radius: 7px;
          color: #6b7280;
          font-size: 13px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 500;
          padding: 7px 13px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .sc-btn-ghost:hover {
          border-color: #6366f1;
          color: #6366f1;
          background: #eef2ff;
        }

        .sc-back-btn {
          background: transparent;
          border: none;
          color: #6366f1;
          font-size: 14px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          padding: 7px 10px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .sc-back-btn:hover {
          color: #4338ca;
          text-decoration: underline;
        }

        .sc-counter {
          background: #eef2ff;
          color: #4338ca;
          border-radius: 7px;
          padding: 7px 13px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          border: 1px solid #c7d2fe;
        }

        /* ── BODY ── */
        .sc-body {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px 16px 100px;
        }

        /* ── SUBJECT CARD ── */
        .sc-subject-card {
          background: #ffffff;
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid #e9eaf0;
          overflow: hidden;
          transition: box-shadow 0.15s;
        }
        .sc-subject-card:hover {
          box-shadow: 0 2px 12px rgba(0,0,0,0.07);
        }

        .sc-subject-header-row {
          display: flex;
          align-items: center;
        }

        .sc-subject-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 16px;
          cursor: pointer;
          border: none;
          background: transparent;
          text-align: left;
          flex: 1;
        }

        .sc-subject-color-bar {
          width: 4px;
          height: 22px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .sc-subject-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          flex: 1;
          text-transform: capitalize;
        }

        .sc-subject-badge {
          font-size: 11.5px;
          font-weight: 600;
          border-radius: 20px;
          padding: 2px 9px;
        }

        .sc-subject-all-btn {
          font-size: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 500;
          border-radius: 6px;
          padding: 4px 10px;
          cursor: pointer;
          border: 1px solid;
          background: transparent;
          transition: all 0.13s;
          margin-right: 12px;
        }
        .sc-subject-all-btn:hover {
          opacity: 0.8;
        }

        .sc-chevron {
          width: 16px;
          height: 16px;
          color: #9ca3af;
          transition: transform 0.22s ease;
          flex-shrink: 0;
        }
        .sc-chevron.open { transform: rotate(180deg); }

        /* ── SUBJECT BODY ── */
        .sc-subject-body {
          overflow: hidden;
          transition: max-height 0.32s cubic-bezier(0.4,0,0.2,1);
        }

        .sc-class-block {
          padding: 2px 16px 14px;
        }

        .sc-class-label {
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #9ca3af;
          margin-bottom: 8px;
          padding-top: 10px;
        }

        .sc-chapters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 6px;
        }
        @media (max-width: 480px) {
          .sc-chapters-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 360px) {
          .sc-chapters-grid { grid-template-columns: 1fr; }
        }

        /* ── CHAPTER CHIP ── */
        .sc-chapter-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #e9eaf0;
          background: #fafafa;
          cursor: pointer;
          transition: all 0.13s;
          text-align: left;
          width: 100%;
        }
        .sc-chapter-chip:hover {
          border-color: #d1d5db;
          background: #f3f4f6;
        }
        .sc-chapter-chip.selected {
          background: var(--chip-light);
          border-color: var(--chip-border);
        }

        .sc-check-box {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1.5px solid #d1d5db;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          transition: all 0.13s;
        }
        .sc-chapter-chip.selected .sc-check-box {
          background: var(--chip-accent);
          border-color: var(--chip-accent);
        }

        .sc-check-icon {
          width: 10px;
          height: 10px;
          color: #fff;
          opacity: 0;
          transition: opacity 0.12s;
        }
        .sc-chapter-chip.selected .sc-check-icon { opacity: 1; }

        .sc-chapter-text {
          font-size: 12.5px;
          color: #374151;
          line-height: 1.35;
          font-weight: 400;
        }
        .sc-chapter-chip.selected .sc-chapter-text {
          color: var(--chip-dark);
          font-weight: 500;
        }

        .sc-divider {
          height: 1px;
          background: #f3f4f6;
          margin: 0 16px;
        }

        /* ── EMPTY ── */
        .sc-empty {
          text-align: center;
          padding: 48px 20px;
          color: #9ca3af;
        }
        .sc-empty-icon { font-size: 32px; margin-bottom: 10px; }
        .sc-empty-text { font-size: 14px; }

        /* ── FOOTER ── */
        .sc-footer {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: #ffffff;
          border-top: 1px solid #e9eaf0;
          padding: 12px 20px;
          z-index: 100;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
        }

        .sc-footer-inner {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sc-footer-info {
          font-size: 13.5px;
          color: #6b7280;
        }
        .sc-footer-info strong {
          color: #111827;
          font-weight: 700;
        }

        .sc-continue-btn {
          background: #6366f1;
          color: #ffffff;
          border: none;
          border-radius: 9px;
          padding: 10px 22px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 7px;
          letter-spacing: 0.1px;
        }
        .sc-continue-btn:hover:not(:disabled) {
          background: #4f46e5;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
          transform: translateY(-1px);
        }
        .sc-continue-btn:disabled {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }
      `}</style>

      <div className="sc-root">

        {/* HEADER */}
        <header className="sc-header">
          <div className="sc-header-inner">
            {onBack && (
              <button className="sc-back-btn" onClick={onBack}>
                ← Back
              </button>
            )}
            <h1 className="sc-title">Select Chapters</h1>

            <div className="sc-search-wrap">
              <svg className="sc-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                className="sc-search"
                placeholder="Search chapters..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button className="sc-btn-ghost" onClick={selectAll}>Select All</button>
            <button className="sc-btn-ghost" onClick={clearAll}>Clear</button>
            <div className="sc-counter">{selected.length} selected</div>
          </div>
        </header>

        {/* BODY */}
        <main className="sc-body">
          {Object.keys(filteredSyllabus).length === 0 ? (
            <div className="sc-empty">
              <div className="sc-empty-icon">🔍</div>
              <div className="sc-empty-text">No chapters found for "{search}"</div>
            </div>
          ) : (
            Object.entries(filteredSyllabus).map(([subject, classes], sIdx) => {
              const color = SUBJECT_COLORS[sIdx % SUBJECT_COLORS.length];
              const subjectChapters = Object.values(classes).flat();
              const selectedCount = subjectChapters.filter((ch) => {
                const chapterIds = [];
                Object.keys(classes).forEach(cls => {
                  chapterIds.push(makeChapterId(subject, cls, ch));
                });
                return chapterIds.some(id => selected.includes(id));
              }).length;
              const allSel = selectedCount === subjectChapters.length && subjectChapters.length > 0;
              const isOpen = expandedSubjects[subject] !== false;
              return (
                <div className="sc-subject-card" key={subject}>

                  <div className="sc-subject-header-row">
                    <button
                      className="sc-subject-header"
                      onClick={() => toggleSubject(subject)}
                    >
                      <div className="sc-subject-color-bar" style={{ background: color.accent }} />
                      <span className="sc-subject-name">{subject}</span>
                      <span
                        className="sc-subject-badge"
                        style={{ background: color.light, color: color.dark, border: `1px solid ${color.border}` }}
                      >
                        {selectedCount}/{subjectChapters.length}
                      </span>
                      <svg className={`sc-chevron ${isOpen ? "open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    <button
                      className="sc-subject-all-btn"
                      style={{ color: color.accent, borderColor: color.border, background: allSel ? color.light : "transparent" }}
                      onClick={(e) => { e.stopPropagation(); selectSubject(subject); }}
                    >
                      {allSel ? "Deselect" : "All"}
                    </button>
                  </div>

                  <div className="sc-subject-body" style={{ maxHeight: isOpen ? "2000px" : "0px" }}>
                    {Object.entries(classes).map(([cls, chapters], cIdx) => (
                      <div key={cls}>
                        {cIdx > 0 && <div className="sc-divider" />}
                        <div className="sc-class-block">
                          <div className="sc-class-label">{cls}</div>
                          <div className="sc-chapters-grid">
                            {chapters.map((ch) => {
                              const chapterId = makeChapterId(subject, cls, ch);
                              const isSel = selected.includes(chapterId);
                              return (
                                <button
                                  key={ch}
                                  className={`sc-chapter-chip ${isSel ? "selected" : ""}`}
                                  style={{
                                    "--chip-accent": color.accent,
                                    "--chip-light": color.light,
                                    "--chip-border": color.border,
                                    "--chip-dark": color.dark,
                                  }}
                                  onClick={() => toggle(subject, cls, ch)}
                                >
                                  <div className="sc-check-box">
                                    <svg className="sc-check-icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </div>
                                  <span className="sc-chapter-text">{ch}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })
          )}
        </main>

        {/* FOOTER */}
        <footer className="sc-footer">
          <div className="sc-footer-inner">
            <div className="sc-footer-info">
              <strong>{selected.length}</strong> chapter{selected.length !== 1 ? "s" : ""} selected
            </div>
            <button
              className="sc-continue-btn"
              onClick={handleContinue}
              disabled={selected.length === 0}
            >
              Continue
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </footer>

      </div>
    </>
  );
}