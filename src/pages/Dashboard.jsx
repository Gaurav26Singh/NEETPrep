import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";

export default function Dashboard({ user, onStartTest }) {
  const [testHistory, setTestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [starredTests, setStarredTests] = useState(() => {
    const saved = localStorage.getItem("neetprep_starred_tests");
    return saved ? JSON.parse(saved) : [];
  });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!openDropdown) return;
    const close = () => setOpenDropdown(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openDropdown]);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      console.log("=== Dashboard Loading ===");
      console.log("Firebase Configured:", isFirebaseConfigured);
      console.log("DB Instance:", db);
      console.log("User:", user);

      if (!isFirebaseConfigured) {
        console.warn("Firebase not configured, loading from localStorage only");
        setError("Firebase not configured");
        const saved = localStorage.getItem("neetprep_test_history");
        if (saved) {
          try {
            setTestHistory(JSON.parse(saved).reverse());
          } catch (e) {
            console.error("Failed to parse localStorage", e);
          }
        }
        setLoading(false);
        return;
      }

      if (user?.uid) {
        try {
          console.log("Querying Firestore for uid:", user.uid);

          if (!db) {
            throw new Error("Firestore instance not available");
          }

          const q = query(
            collection(db, "results"),
            where("uid", "==", user.uid)
          );
          const querySnapshot = await getDocs(q);
          console.log("Query returned", querySnapshot.size, "documents");

          const history = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log("Document:", doc.id, data);
            history.push({ id: doc.id, ...data });
          });

          history.sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
          });

          setTestHistory(history);
          console.log("Test history loaded successfully:", history.length, "tests");

          if (history.length > 0) {
            localStorage.setItem("neetprep_test_history", JSON.stringify(history));
          }
        } catch (firebaseError) {
          console.error("=== Firestore Error ===");
          console.error("Error code:", firebaseError.code);
          console.error("Error message:", firebaseError.message);
          console.error("Full error:", firebaseError);
          setError(firebaseError.message);

          console.log("Falling back to localStorage");
          const saved = localStorage.getItem("neetprep_test_history");
          if (saved) {
            try {
              const parsed = JSON.parse(saved).reverse();
              setTestHistory(parsed);
              console.log("Loaded from localStorage fallback:", parsed.length, "tests");
            } catch (e) {
              console.error("Failed to parse localStorage", e);
            }
          }
        }
      } else {
        console.log("User is guest, loading from localStorage");
        const saved = localStorage.getItem("neetprep_test_history");
        if (saved) {
          try {
            const parsed = JSON.parse(saved).reverse();
            setTestHistory(parsed);
            console.log("Guest test history loaded:", parsed.length, "tests");
          } catch (e) {
            console.error("Failed to parse test history", e);
          }
        }
      }
      setLoading(false);
    };

    loadHistory();
  }, [user]);

  const totalTests = testHistory.length;
  const averageScore =
    totalTests > 0
      ? Math.round(
          testHistory.reduce((sum, t) => {
            const value =
              typeof t.accuracy === "number"
                ? t.accuracy
                : typeof t.score === "number"
                ? t.score
                : 0;
            return sum + value;
          }, 0) / totalTests
        )
      : 0;
  const bestScore =
    totalTests > 0
      ? Math.max(
          ...testHistory.map((t) =>
            typeof t.accuracy === "number"
              ? t.accuracy
              : typeof t.score === "number"
              ? t.score
              : 0
          )
        )
      : 0;

  const allSubjects = useMemo(() => {
    const subjects = new Set();
    testHistory.forEach((test) => {
      (test.subjects || []).forEach((s) => subjects.add(s));
    });
    return Array.from(subjects).sort();
  }, [testHistory]);

  const allTopics = useMemo(() => {
    const topics = new Set();
    testHistory.forEach((test) => {
      const chapterNames =
        test.chapters && Object.entries(test.chapters).length > 0
          ? Object.values(test.chapters).flat()
          : (test.questions || []).map((q) => q.chapter).filter(Boolean);
      chapterNames.forEach((chapter) => topics.add(chapter));
    });
    return Array.from(topics).sort();
  }, [testHistory]);

  const clearFilters = () => {
    setSelectedSubject("all");
    setSelectedTopic("all");
    setSelectedDateRange("all");
    setShowStarredOnly(false);
    setTopicSearch("");
  };

  const toggleStarred = (testId) => {
    setStarredTests((prev) => {
      const updated = prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId];
      localStorage.setItem("neetprep_starred_tests", JSON.stringify(updated));
      return updated;
    });
  };

  const getDateRangeFilter = (range) => {
    const now = new Date();
    const startDate = new Date();

    switch (range) {
      case "last7":
        startDate.setDate(now.getDate() - 7);
        return startDate;
      case "last30":
        startDate.setDate(now.getDate() - 30);
        return startDate;
      case "last90":
        startDate.setDate(now.getDate() - 90);
        return startDate;
      default:
        return null;
    }
  };

  const filteredTests = useMemo(() => {
    return testHistory.filter((test) => {
      const testDate = new Date(
        test.createdAt?.seconds
          ? test.createdAt.seconds * 1000
          : test.createdAt
      );
      const testSubjects = test.subjects || [];
      const chapterNames =
        test.chapters && Object.entries(test.chapters).length > 0
          ? Array.from(
              new Set(Object.values(test.chapters).flat().filter(Boolean))
            )
          : Array.from(
              new Set(
                (test.questions || []).map((q) => q.chapter).filter(Boolean)
              )
            );

      if (selectedSubject !== "all" && !testSubjects.includes(selectedSubject)) {
        return false;
      }

      if (selectedTopic !== "all" && !chapterNames.includes(selectedTopic)) {
        return false;
      }

      if (selectedDateRange !== "all") {
        const rangeStart = getDateRangeFilter(selectedDateRange);
        if (rangeStart && testDate < rangeStart) {
          return false;
        }
      }

      if (showStarredOnly && !starredTests.includes(test.id)) {
        return false;
      }

      return true;
    });
  }, [testHistory, selectedSubject, selectedTopic, selectedDateRange, showStarredOnly, starredTests]);

  const filteredTopics = useMemo(() => {
    return allTopics.filter((topic) =>
      topic.toLowerCase().includes(topicSearch.toLowerCase())
    );
  }, [allTopics, topicSearch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-600">
            Ready to ace your NEET preparation? Start a new test or review your progress.
          </p>
        </div>

        {/* Stats Cards */}
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 transition-opacity ${
            loading ? "opacity-50 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold text-gray-900">{totalTests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Best Score</p>
                <p className="text-2xl font-bold text-gray-900">{bestScore}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={onStartTest}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Start New Test
            </button>
          </div>
        </div>

        {/* Test History */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Test History</h2>

          {/* Dropdown Filters with Clear Button */}
          <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-end md:gap-3 md:justify-between">
            <div className="flex gap-3 flex-wrap flex-1">

              {/* Subject Filter */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === "subject" ? null : "subject");
                  }}
                  className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs pl-3 pr-2.5 py-2 rounded-full hover:bg-indigo-100 transition"
                >
                  <span>{selectedSubject === "all" ? "All Subjects" : selectedSubject}</span>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    style={{
                      transform: openDropdown === "subject" ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.18s",
                    }}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {openDropdown === "subject" && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[200px]">
                    <button
                      onClick={() => { setSelectedSubject("all"); setOpenDropdown(null); }}
                      className={`w-full px-4 py-3 text-left text-sm transition border-b border-gray-50 ${
                        selectedSubject === "all"
                          ? "bg-indigo-50 text-indigo-700 font-semibold"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      All Subjects
                    </button>
                    {allSubjects.map((subject) => (
                      <button
                        key={subject}
                        onClick={() => { setSelectedSubject(subject); setOpenDropdown(null); }}
                        className={`w-full px-4 py-3 text-left text-sm transition border-b border-gray-50 ${
                          selectedSubject === subject
                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Topic Filter */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === "topic" ? null : "topic");
                    setTopicSearch("");
                  }}
                  className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs pl-3 pr-2.5 py-2 rounded-full hover:bg-indigo-100 transition"
                >
                  <span>{selectedTopic === "all" ? "All Topics" : selectedTopic}</span>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    style={{
                      transform: openDropdown === "topic" ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.18s",
                    }}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {openDropdown === "topic" && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[220px]">
                    {/* Search Input */}
                    <div className="px-3 py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="text-gray-400 flex-shrink-0"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                        </svg>
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search topics..."
                          value={topicSearch}
                          onChange={(e) => setTopicSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none"
                        />
                        {topicSearch && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setTopicSearch(""); }}
                            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="overflow-y-auto max-h-48 scrollbar-thin">
                      <button
                        onClick={() => { setSelectedTopic("all"); setOpenDropdown(null); setTopicSearch(""); }}
                        className={`w-full px-4 py-3 text-left text-sm transition border-b border-gray-50 ${
                          selectedTopic === "all"
                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        All Topics
                      </button>
                      {filteredTopics.length > 0 ? (
                        filteredTopics.map((topic) => (
                          <button
                            key={topic}
                            onClick={() => { setSelectedTopic(topic); setOpenDropdown(null); setTopicSearch(""); }}
                            className={`w-full px-4 py-3 text-left text-sm transition border-b border-gray-50 ${
                              selectedTopic === topic
                                ? "bg-indigo-50 text-indigo-700 font-semibold"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {topic}
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-4 text-xs text-gray-400 italic text-center">
                          No topics found for "{topicSearch}"
                        </p>
                      )}
                    </div>

                    {/* Footer count */}
                    {allTopics.length > 0 && (
                      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-400">
                          {filteredTopics.length} of {allTopics.length} topics
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Date Filter */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === "date" ? null : "date");
                  }}
                  className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs pl-3 pr-2.5 py-2 rounded-full hover:bg-indigo-100 transition"
                >
                  <span>
                    {selectedDateRange === "all"
                      ? "All Time"
                      : selectedDateRange === "last7"
                      ? "Past Week"
                      : selectedDateRange === "last30"
                      ? "Past Month"
                      : "Past 90 Days"}
                  </span>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    style={{
                      transform: openDropdown === "date" ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.18s",
                    }}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {openDropdown === "date" && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[200px]">
                    {["all", "last7", "last30", "last90"].map((option) => {
                      const labels = {
                        all: "All Time",
                        last7: "Past Week",
                        last30: "Past Month",
                        last90: "Past 90 Days",
                      };
                      return (
                        <button
                          key={option}
                          onClick={() => { setSelectedDateRange(option); setOpenDropdown(null); }}
                          className={`w-full px-4 py-3 text-left text-sm transition border-b border-gray-50 ${
                            selectedDateRange === option
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {labels[option]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={clearFilters}
              className="px-6 py-2 rounded-full border border-gray-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition whitespace-nowrap"
            >
              Clear Filters
            </button>
          </div>

          {/* Starred Tests Only Toggle */}
          <div className="mb-6 flex items-center gap-4">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showStarredOnly}
                  onChange={() => setShowStarredOnly(!showStarredOnly)}
                  className="sr-only"
                />
                <div
                  className={`block w-14 h-8 rounded-full transition-all duration-300 ${
                    showStarredOnly ? "bg-yellow-400" : "bg-gray-300"
                  }`}
                ></div>
                <div
                  className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-all duration-300 transform ${
                    showStarredOnly ? "translate-x-6" : "translate-x-0"
                  }`}
                ></div>
              </div>
              <span className="ml-3 text-sm font-semibold text-gray-700">⭐ Starred Only</span>
            </label>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              <strong>Note:</strong> {error}. Using cached data from localStorage. Make sure Firestore Rules are set correctly.
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="mb-6">
                  <div className="inline-block">
                    <svg className="w-16 h-16 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading your test history...</h3>
                <p className="text-sm text-gray-500">Fetching your recent tests and performance data</p>
              </div>
            </div>
          ) : filteredTests.length === 0 ? (
            <p className="text-gray-500">No tests match your filters.</p>
          ) : (
            <div className="max-h-[540px] overflow-y-auto pr-2">
              <div
                className="space-y-4 animate-in fade-in duration-500"
                style={{ animation: "fadeIn 0.5s ease-in-out" }}
              >
                {filteredTests.slice(0, 10).map((test, index) => {
                  const date = test.createdAt
                    ? new Date(
                        test.createdAt.seconds
                          ? test.createdAt.seconds * 1000
                          : test.createdAt
                      )
                    : new Date(test.date);
                  const testChapters =
                    test.chapters && Object.entries(test.chapters).length > 0
                      ? test.chapters
                      : test.questions
                      ? test.questions.reduce((acc, q) => {
                          const section = q.section || "Other";
                          const chapter = q.chapter || "General";
                          if (!acc[section]) acc[section] = new Set();
                          acc[section].add(chapter);
                          return acc;
                        }, {})
                      : {};
                  const chapterGroups = Object.entries(testChapters).map(
                    ([subject, chapterList]) => ({
                      subject,
                      chapters: Array.isArray(chapterList)
                        ? chapterList
                        : Array.from(chapterList),
                    })
                  );
                  const score =
                    typeof test.accuracy === "number"
                      ? test.accuracy
                      : typeof test.score === "number"
                      ? test.score
                      : 0;
                  const correct = test.correct || 0;
                  const total = test.totalQuestions || test.total || 0;
                  const colors = [
                    "text-sky-600",
                    "text-fuchsia-600",
                    "text-emerald-600",
                    "text-amber-600",
                    "text-indigo-600",
                    "text-rose-600",
                  ];

                  return (
                    <button
                      key={test.id || index}
                      onClick={() => {
                        setSelectedTest(test);
                        setShowDetails(true);
                      }}
                      className="w-full text-left flex flex-col gap-4 sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition cursor-pointer group transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
                      style={{ animation: `slideUp 0.6s ease-out ${index * 50}ms both` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStarred(test.id);
                            }}
                            className="text-xl flex-shrink-0 hover:scale-110 transition-transform"
                            style={{
                              color: starredTests.includes(test.id) ? "#FFD700" : "black",
                              textShadow: starredTests.includes(test.id)
                                ? "none"
                                : "0 0 0 0.5px black",
                            }}
                          >
                            {starredTests.includes(test.id) ? "⭐" : "☆"}
                          </button>
                          <p className="font-medium text-gray-900">
                            Test • {date.toLocaleDateString()}
                          </p>
                        </div>

                        {chapterGroups.length > 0 ? (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-3 items-start py-1 text-sm">
                              {chapterGroups.map(({ subject }, idx) => (
                                <span key={subject} className={`inline-flex items-center gap-1 font-semibold ${colors[idx % colors.length]}`}>
                                  {subject}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-gray-600">
                            Selected chapters unavailable
                          </p>
                        )}
                      </div>
                      <div className="text-right min-w-[120px] sm:min-w-0">
                        <p className="text-2xl font-bold text-gray-900">{score}%</p>
                        <p className="text-sm text-gray-600">{correct}/{total} correct</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Test Details Modal */}
        {showDetails && selectedTest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 pt-20">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Test Details</h2>
                  <div className="mt-2 space-y-1">
                    <p className="text-blue-100 text-sm">
                      {selectedTest.createdAt
                        ? new Date(
                            selectedTest.createdAt.seconds
                              ? selectedTest.createdAt.seconds * 1000
                              : selectedTest.createdAt
                          ).toLocaleString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : selectedTest.date
                        ? new Date(selectedTest.date).toLocaleString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "Date unavailable"}
                    </p>
                    {selectedTest.chapters &&
                    Object.entries(selectedTest.chapters).length > 0 ? (
                      Object.entries(selectedTest.chapters).map(([subject, chapterList]) => (
                        <p key={subject} className="text-blue-100 text-sm">
                          <span className="font-semibold">{subject}:</span>{" "}
                          {chapterList.join(", ")}
                        </p>
                      ))
                    ) : (
                      <p className="text-blue-100 text-sm">
                        {(selectedTest.subjects || []).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-white hover:bg-blue-600 p-2 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-6 pt-8 space-y-6">
                {/* Score Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 font-medium">Correct</p>
                    <p className="text-3xl font-bold text-green-900">{selectedTest.correct}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 font-medium">Incorrect</p>
                    <p className="text-3xl font-bold text-red-900">{selectedTest.incorrect}</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700 font-medium">Unattempted</p>
                    <p className="text-3xl font-bold text-gray-900">{selectedTest.unattempted}</p>
                  </div>
                </div>

                {/* Score */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-blue-700 font-medium">Accuracy</p>
                  <p className="text-5xl font-bold text-blue-900">{selectedTest.accuracy}%</p>
                </div>

                {/* Subject-wise Performance */}
                {selectedTest.sectionStats &&
                  Object.keys(selectedTest.sectionStats).length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Subject-wise Performance
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(selectedTest.sectionStats).map(([subject, stats]) => {
                          const accuracy =
                            stats.total > 0
                              ? Math.round((stats.correct / stats.total) * 100)
                              : 0;
                          return (
                            <div
                              key={subject}
                              className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                            >
                              <p className="font-semibold text-gray-900">{subject}</p>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-sm text-gray-600">
                                  {stats.correct}/{stats.total} correct
                                </span>
                                <span
                                  className={`text-lg font-bold ${
                                    accuracy >= 80
                                      ? "text-green-600"
                                      : accuracy >= 60
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {accuracy}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Weak Topics */}
                {selectedTest.questions &&
                  (() => {
                    const weakTopics = {};
                    selectedTest.questions.forEach((q, i) => {
                      const userAnswer = selectedTest.answers?.[i];
                      const isCorrect = userAnswer === q.answer;
                      if (!isCorrect) {
                        const topicKey = `${q.section} - ${q.chapter}`;
                        if (!weakTopics[topicKey]) {
                          weakTopics[topicKey] = { correct: 0, total: 0 };
                        }
                        weakTopics[topicKey].total++;
                        if (isCorrect) weakTopics[topicKey].correct++;
                      }
                    });

                    const sortedWeakTopics = Object.entries(weakTopics).sort((a, b) => {
                      const accuracyA =
                        a[1].total > 0 ? (a[1].correct / a[1].total) * 100 : 0;
                      const accuracyB =
                        b[1].total > 0 ? (b[1].correct / b[1].total) * 100 : 0;
                      return accuracyA - accuracyB;
                    });

                    if (sortedWeakTopics.length > 0) {
                      return (
                        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-red-900 mb-4">
                            📍 Areas to Improve
                          </h3>
                          <div className="space-y-2">
                            {sortedWeakTopics.slice(0, 5).map(([topic, stats]) => {
                              const accuracy =
                                stats.total > 0
                                  ? Math.round((stats.correct / stats.total) * 100)
                                  : 0;
                              return (
                                <div
                                  key={topic}
                                  className="flex justify-between items-center bg-white p-3 rounded-lg border border-red-100"
                                >
                                  <span className="text-sm font-medium text-gray-900">
                                    {topic}
                                  </span>
                                  <span className="text-sm font-semibold text-red-600">
                                    {accuracy}% • {stats.correct}/{stats.total}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                {/* Questions and Answers */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Questions &amp; Answers
                  </h3>
                  <div className="space-y-4">
                    {(selectedTest.questions || []).map((q, i) => {
                      const userAnswer = selectedTest.answers?.[i];
                      const isCorrect = userAnswer === q.answer;
                      const isUnattempted = !userAnswer;

                      return (
                        <div key={i} className="border border-gray-200 rounded-lg p-4">
                          {/* Question */}
                          <div className="mb-4">
                            <p className="font-semibold text-gray-900 mb-2">
                              Q{i + 1}. {q.question}
                            </p>
                            <div className="flex gap-2 items-center">
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                                {q.section}
                              </span>
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                {q.chapter}
                              </span>
                            </div>
                          </div>

                          {/* Options */}
                          <div className="space-y-2 mb-4">
                            {q.options.map((opt, idx) => {
                              const isUserSelected = opt === userAnswer;
                              const isCorrectOption = opt === q.answer;
                              let bgColor = "bg-white border-gray-200";
                              let textColor = "text-gray-900";

                              if (isCorrectOption) {
                                bgColor = "bg-green-50 border-green-300";
                                textColor = "text-green-900";
                              } else if (isUserSelected && !isCorrect) {
                                bgColor = "bg-red-50 border-red-300";
                                textColor = "text-red-900";
                              }

                              return (
                                <div
                                  key={idx}
                                  className={`border-2 rounded-lg p-3 flex items-center gap-2 ${bgColor} ${textColor}`}
                                >
                                  <span className="font-semibold">
                                    {String.fromCharCode(65 + idx)}.
                                  </span>
                                  <span>{opt}</span>
                                  {isCorrectOption && (
                                    <span className="ml-auto text-green-600 font-bold">✓</span>
                                  )}
                                  {isUserSelected && !isCorrect && (
                                    <span className="ml-auto text-red-600 font-bold">✗</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* User Answer Summary */}
                          <div
                            className={`text-sm p-3 rounded-lg ${
                              isUnattempted
                                ? "bg-gray-100 text-gray-700"
                                : isCorrect
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            <strong>Your Answer:</strong>{" "}
                            {isUnattempted ? "Not Attempted" : userAnswer}
                            {!isUnattempted && (
                              <span className="ml-2">
                                {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-2">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}