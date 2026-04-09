import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

import jsPDF from "jspdf";

export default function ResultScreen({ questions, answers, onRestart }) {
  const [reviewMode, setReviewMode] = useState(false);
  const [current, setCurrent] = useState(0);
  const [downloading, setDownloading] = useState(false);

  // =========================
  // CALCULATIONS
  // =========================
  const result = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    const sectionStats = {};

    questions.forEach((q, i) => {
      const userAns = answers[i];
      const correctAns = q.answer;
      const section = q.section || "Other";

      if (!sectionStats[section]) sectionStats[section] = { correct: 0, total: 0 };
      sectionStats[section].total++;

      if (!userAns) unattempted++;
      else if (userAns === correctAns) { correct++; sectionStats[section].correct++; }
      else incorrect++;
    });

    const score = correct * 4 - incorrect;
    const accuracy =
      correct + incorrect === 0 ? 0 : Math.round((correct / (correct + incorrect)) * 100);

    return { correct, incorrect, unattempted, score, accuracy, sectionStats };
  }, [questions, answers]);

  // =========================
  // WEAK SUBJECTS
  // =========================
  const weakSubjects = Object.entries(result.sectionStats)
    .map(([sec, data]) => ({
      sec,
      acc: data.total === 0 ? 0 : Math.round((data.correct / data.total) * 100)
    }))
    .filter((s) => s.acc < 60)
    .sort((a, b) => a.acc - b.acc);

  const weakSubject = weakSubjects[0] || null;

  // =========================
  // WEAK TOPICS
  // =========================
  const weakTopicsBySubject = {};
  questions.forEach((q, i) => {
    const subject = q.section || "Other";
    const topic = q.chapter || "General";
    const userAns = answers[i];
    if (!weakTopicsBySubject[subject]) weakTopicsBySubject[subject] = {};
    if (!weakTopicsBySubject[subject][topic]) weakTopicsBySubject[subject][topic] = { correct: 0, total: 0 };
    weakTopicsBySubject[subject][topic].total++;
    if (userAns && userAns === q.answer) weakTopicsBySubject[subject][topic].correct++;
  });

  const formattedWeakTopics = Object.entries(weakTopicsBySubject).map(([subject, topics]) => {
    const weak = Object.entries(topics)
      .map(([topic, data]) => ({ topic, acc: data.correct / data.total }))
      .filter((t) => t.acc < 0.5)
      .map((t) => t.topic);
    return { subject, topics: weak };
  });

  // =========================
  // CHART DATA
  // =========================
  const sectionData = Object.entries(result.sectionStats).map(([sec, data]) => ({
    name: sec,
    accuracy: data.total === 0 ? 0 : Math.round((data.correct / data.total) * 100)
  }));

  const pieData = [
    { name: "Correct", value: result.correct },
    { name: "Incorrect", value: result.incorrect },
    { name: "Unattempted", value: result.unattempted }
  ];
  const COLORS = ["#22c55e", "#ef4444", "#9ca3af"];

  // =========================
  // PDF GENERATION
  // =========================
  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const W = 210;
      const margin = 14;
      const contentW = W - margin * 2;
      let y = 0;

      const addPage = () => { pdf.addPage(); y = 16; };
      const checkY = (needed) => { if (y + needed > 275) addPage(); };

      const hex2rgb = (hex) => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16)
      ];
      const setFill = (hex) => pdf.setFillColor(...hex2rgb(hex));
      const setTC = (hex) => pdf.setTextColor(...hex2rgb(hex));
      const setDC = (hex) => pdf.setDrawColor(...hex2rgb(hex));

      // ── HEADER ────────────────────────────────────────────
      setFill("#1e40af");
      pdf.rect(0, 0, W, 38, "F");
      setFill("#3b82f6");
      pdf.rect(0, 30, W, 8, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      setTC("#ffffff");
      pdf.text("Test Performance Report", W / 2, 17, { align: "center" });
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`,
        W / 2, 27, { align: "center" }
      );

      y = 48;

      // ── SCORE CARDS ───────────────────────────────────────
      const cards = [
        { label: "Total Score",  value: result.score,         color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
        { label: "Correct",      value: result.correct,       color: "#15803d", bg: "#dcfce7", border: "#4ade80" },
        { label: "Incorrect",    value: result.incorrect,     color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
        { label: "Unattempted",  value: result.unattempted,   color: "#6b7280", bg: "#f9fafb", border: "#d1d5db" },
        { label: "Accuracy",     value: `${result.accuracy}%`, color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
      ];
      const cardW = (contentW - 8) / cards.length;
      cards.forEach((c, i) => {
        const cx = margin + i * (cardW + 2);
        setFill(c.bg); setDC(c.border);
        pdf.setLineWidth(0.4);
        pdf.roundedRect(cx, y, cardW, 22, 2, 2, "FD");
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); setTC("#6b7280");
        pdf.text(c.label, cx + cardW / 2, y + 7, { align: "center" });
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); setTC(c.color);
        pdf.text(String(c.value), cx + cardW / 2, y + 17, { align: "center" });
      });
      y += 30;

      // ── SECTION ACCURACY BAR CHART ────────────────────────
      checkY(72);
      setFill("#f8fafc"); setDC("#e2e8f0");
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, y, contentW, 68, 3, 3, "FD");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); setTC("#1e293b");
      pdf.text("Section Accuracy", margin + 4, y + 9);

      const bAX = margin + 32, bAY = y + 14, bAH = 44, bAW = contentW - 36;
      const barPalette = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4"];

      pdf.setLineWidth(0.2); setDC("#e2e8f0");
      [0,25,50,75,100].forEach((pct) => {
        const gx = bAX + (pct / 100) * bAW;
        pdf.line(gx, bAY, gx, bAY + bAH);
        pdf.setFontSize(6); setTC("#94a3b8"); pdf.setFont("helvetica","normal");
        pdf.text(`${pct}%`, gx, bAY + bAH + 5, { align: "center" });
      });

      const bH2 = Math.min(9, (bAH - sectionData.length * 3) / Math.max(sectionData.length, 1));
      const bGap = (bAH - sectionData.length * bH2) / (sectionData.length + 1);

      sectionData.forEach((s, i) => {
        const bx = bAX;
        const by = bAY + bGap + i * (bH2 + bGap);
        const bw = (s.accuracy / 100) * bAW;
        setFill(barPalette[i % barPalette.length]);
        pdf.rect(bx, by, bw, bH2, "F");
        pdf.setFontSize(6.5); setTC("#1e293b"); pdf.setFont("helvetica","bold");
        pdf.text(s.name, bx - 2, by + bH2 / 2 + 2, { align: "right" });
        if (bw > 12) { setTC("#ffffff"); pdf.text(`${s.accuracy}%`, bx + bw - 2, by + bH2 / 2 + 2, { align: "right" }); }
        else { setTC("#1e293b"); pdf.text(`${s.accuracy}%`, bx + bw + 2, by + bH2 / 2 + 2); }
      });
      y += 74;

      // ── ATTEMPT PIE CHART ─────────────────────────────────
      checkY(60);
      setFill("#f8fafc"); setDC("#e2e8f0");
      pdf.roundedRect(margin, y, contentW, 54, 3, 3, "FD");
      pdf.setFont("helvetica","bold"); pdf.setFontSize(11); setTC("#1e293b");
      pdf.text("Attempt Analysis", margin + 4, y + 9);

      const total = result.correct + result.incorrect + result.unattempted;
      const pieItems = [
        { label: "Correct",     value: result.correct,     color: "#22c55e" },
        { label: "Incorrect",   value: result.incorrect,   color: "#ef4444" },
        { label: "Unattempted", value: result.unattempted, color: "#9ca3af" },
      ];
      const pcx = margin + 30, pcy = y + 31, pr = 20;
      let startAngle = -Math.PI / 2;
      pieItems.forEach((item) => {
        if (item.value === 0) return;
        const slice = (item.value / total) * Math.PI * 2;
        const steps = Math.max(16, Math.round(slice * 24));
        setFill(item.color);
        for (let s2 = 0; s2 < steps; s2++) {
          const a1 = startAngle + (s2 / steps) * slice;
          const a2 = startAngle + ((s2 + 1) / steps) * slice;
          pdf.triangle(
            pcx, pcy,
            pcx + Math.cos(a1) * pr, pcy + Math.sin(a1) * pr,
            pcx + Math.cos(a2) * pr, pcy + Math.sin(a2) * pr,
            "F"
          );
        }
        startAngle += slice;
      });
      setFill("#f8fafc"); pdf.circle(pcx, pcy, pr * 0.5, "F");

      const legX = margin + 62;
      pieItems.forEach((item, i) => {
        const ly = y + 16 + i * 13;
        setFill(item.color); pdf.roundedRect(legX, ly - 4, 9, 6, 1, 1, "F");
        pdf.setFont("helvetica","normal"); pdf.setFontSize(9); setTC("#374151");
        pdf.text(item.label, legX + 12, ly);
        pdf.setFont("helvetica","bold"); setTC(item.color);
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        pdf.text(`${item.value}  (${pct}%)`, legX + 52, ly);
      });
      y += 60;

      // ── WEAK SUBJECT + WEAK TOPICS ────────────────────────
      checkY(46);
      const halfW = (contentW - 4) / 2;

      if (weakSubjects.length > 0) {
        const rowH = 12;
        const boxH = 14 + weakSubjects.length * rowH;
        setFill("#fef2f2"); setDC("#fca5a5"); pdf.setLineWidth(0.4);
        pdf.roundedRect(margin, y, halfW, boxH, 3, 3, "FD");
        pdf.setFont("helvetica","bold"); pdf.setFontSize(10); setTC("#991b1b");
        pdf.text("Weak Subjects", margin + 4, y + 9);
        let wy = y + 17;
        weakSubjects.forEach((ws) => {
          pdf.setFont("helvetica","bold"); pdf.setFontSize(9); setTC("#dc2626");
          pdf.text(ws.sec, margin + 6, wy);
          pdf.setFont("helvetica","normal"); pdf.setFontSize(8); setTC("#6b7280");
          pdf.text(`Accuracy: ${ws.acc}%`, margin + 6, wy + 5);
          wy += rowH;
        });
      }

      const hasWeakTopics = formattedWeakTopics.some((s) => s.topics.length > 0);
      if (hasWeakTopics) {
        const tx = margin + halfW + 4;
        setFill("#fefce8"); setDC("#fde68a");
        pdf.roundedRect(tx, y, halfW, 40, 3, 3, "FD");
        pdf.setFont("helvetica","bold"); pdf.setFontSize(10); setTC("#92400e");
        pdf.text("Weak Topics (< 50% accuracy)", tx + 4, y + 9);
        let ty = y + 18;
        formattedWeakTopics.filter((s) => s.topics.length > 0).forEach((s) => {
          pdf.setFont("helvetica","bold"); pdf.setFontSize(8); setTC("#78350f");
          pdf.text(`${s.subject}:`, tx + 4, ty); ty += 5;
          s.topics.slice(0, 4).forEach((t) => {
            pdf.setFont("helvetica","normal"); pdf.setFontSize(7.5); setTC("#374151");
            pdf.text(`• ${t}`, tx + 6, ty); ty += 4.5;
          });
        });
      }
      y += 46;

      // ── PAGE 2+: ANSWER MAPPING ───────────────────────────
      addPage();

      setFill("#1e40af");
      pdf.rect(0, 0, W, 20, "F");
      pdf.setFont("helvetica","bold"); pdf.setFontSize(14); setTC("#ffffff");
      pdf.text("Answer Mapping — Question-by-Question Review", W / 2, 13, { align: "center" });
      y = 28;

      questions.forEach((q, i) => {
        const userAns = answers[i];
        const isCorrect = userAns && userAns === q.answer;
        const isWrong = userAns && userAns !== q.answer;

        const statusBg     = isCorrect ? "#f0fdf4" : isWrong ? "#fef2f2" : "#f9fafb";
        const statusBorder = isCorrect ? "#86efac" : isWrong ? "#fca5a5" : "#e5e7eb";
        const statusColor  = isCorrect ? "#16a34a" : isWrong ? "#dc2626" : "#6b7280";
        const statusLabel  = isCorrect ? "Correct  +4" : isWrong ? "Wrong  -1" : "Skipped  0";
        const statusBadge  = isCorrect ? "#16a34a" : isWrong ? "#dc2626" : "#9ca3af";

        const qLines = pdf.splitTextToSize(`Q${i + 1}. ${q.question}`, contentW - 40);
        const optCount = q.options ? q.options.length : 0;
        const boxH = 8 + qLines.length * 5 + optCount * 6.5 + 6;

        checkY(boxH + 4);

        setFill(statusBg); setDC(statusBorder); pdf.setLineWidth(0.4);
        pdf.roundedRect(margin, y, contentW, boxH, 2, 2, "FD");

        setFill(statusBadge);
        pdf.roundedRect(margin + contentW - 30, y + 3, 28, 6.5, 1.5, 1.5, "F");
        pdf.setFont("helvetica","bold"); pdf.setFontSize(7); setTC("#ffffff");
        pdf.text(statusLabel, margin + contentW - 16, y + 7.8, { align: "center" });

        pdf.setFont("helvetica","bold"); pdf.setFontSize(8.5); setTC("#1e293b");
        pdf.text(qLines, margin + 4, y + 8);

        let oy = y + 8 + qLines.length * 5 + 1;

        if (q.options) {
          q.options.forEach((opt) => {
            const isCorrectOpt = opt === q.answer;
            const isUserOpt = opt === userAns;
            let oBg = "#ffffff", oBorder = "#e5e7eb", oTC = "#374151";
            if (isCorrectOpt)         { oBg = "#dcfce7"; oBorder = "#4ade80"; oTC = "#15803d"; }
            else if (isUserOpt && isWrong) { oBg = "#fee2e2"; oBorder = "#f87171"; oTC = "#b91c1c"; }

            setFill(oBg); setDC(oBorder); pdf.setLineWidth(0.25);
            pdf.roundedRect(margin + 4, oy, contentW - 8, 5.5, 1, 1, "FD");
            pdf.setFont("helvetica", isCorrectOpt || (isUserOpt && isWrong) ? "bold" : "normal");
            pdf.setFontSize(7.5); setTC(oTC);
            const prefix = isCorrectOpt ? "✓ " : (isUserOpt && isWrong) ? "✗ " : "  ";
            const optLines = pdf.splitTextToSize(`${prefix}${opt}`, contentW - 14);
            pdf.text(optLines[0], margin + 7, oy + 4);
            oy += 6.5;
          });
        }
        y = oy + 4;
      });

      // ── FOOTER on all pages ───────────────────────────────
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        setFill("#1e40af");
        pdf.rect(0, 287, W, 10, "F");
        pdf.setFont("helvetica","normal"); pdf.setFontSize(7); setTC("#bfdbfe");
        pdf.text("Test Performance Report", margin, 293);
        pdf.text(`Page ${p} of ${totalPages}`, W - margin, 293, { align: "right" });
      }

      pdf.save("Test_Report.pdf");
    } finally {
      setDownloading(false);
    }
  };

  // =========================
  // REVIEW MODE
  // =========================
  if (reviewMode) {
    const q = questions[current];
    const userAns = answers[current];
    let score = 0;
    if (!userAns) score = 0;
    else if (userAns === q.answer) score = +1;
    else score = -1;

    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <h2 className="text-2xl font-bold mb-4">Review Mode</h2>
        <p className="mb-4 font-semibold">{current + 1}. {q.question}</p>
        <p className={`mb-3 font-bold ${score === 1 ? "text-green-600" : score === -1 ? "text-red-600" : "text-gray-500"}`}>
          Score: {score === 1 ? "+1" : score === -1 ? "-1" : "0"}
        </p>
        {q.options.map((opt, idx) => {
          let style = "border px-4 py-2 mt-2 w-full text-left rounded";
          if (opt === q.answer) style += " bg-green-300";
          else if (opt === userAns) style += " bg-red-300";
          return <div key={idx} className={style}>{opt}</div>;
        })}
        <div className="mt-6 flex gap-3">
          <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} className="bg-gray-300 px-4 py-2 rounded">Prev</button>
          {current !== questions.length - 1 && (
            <button onClick={() => setCurrent((c) => c + 1)} className="bg-gray-300 px-4 py-2 rounded">Next</button>
          )}
        </div>
        <button onClick={() => setReviewMode(false)} className="mt-6 bg-blue-500 text-white px-6 py-2 rounded">
          Back to Result
        </button>
      </div>
    );
  }

  // =========================
  // RESULT SCREEN
  // =========================
  return (
    <div id="report-section" className="min-h-screen bg-gradient-to-br from-green-50 to-white p-6">

      <h1 className="text-4xl font-bold text-center mb-8">🎯 Test Result</h1>

      {/* MAIN STATS */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <p>Score</p>
          <h2 className="text-3xl font-bold text-green-600">{result.score}</h2>
        </div>
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <p>Correct</p>
          <h2 className="text-2xl text-green-500">{result.correct}</h2>
        </div>
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <p>Incorrect</p>
          <h2 className="text-2xl text-red-500">{result.incorrect}</h2>
        </div>
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <p>Accuracy</p>
          <h2 className="text-2xl text-blue-500">{result.accuracy}%</h2>
        </div>
      </div>

      {/* ANALYTICS */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="text-xl font-bold mb-6">📊 Performance Analytics</h2>
        <div className="grid md:grid-cols-2 gap-6">

          <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-3">Section Accuracy</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sectionData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-3">Attempt Analysis</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  outerRadius={85}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend
                  iconType="circle"
                  iconSize={11}
                  formatter={(value, entry) => (
                    <span style={{ color: entry.color, fontWeight: 600, fontSize: 13 }}>
                      {value}: <strong>{entry.payload.value}</strong>
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>

      {/* WEAK SUBJECT + WEAK TOPICS — items-start prevents height stretching */}
      <div className="grid md:grid-cols-2 gap-6 mb-8 items-start">
        {weakSubjects.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-4">⚠️ Weak Subjects</h2>
            <div className="flex flex-col gap-3">
              {weakSubjects.map((ws, i) => (
                <div key={i} className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-2xl">📉</div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-700">{ws.sec}</p>
                    <p className="text-sm text-gray-500">
                      Accuracy: <span className="font-bold text-red-500">{ws.acc}%</span>
                    </p>
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                    ws.acc === 0 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {ws.acc === 0 ? "Critical" : "Needs Work"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {formattedWeakTopics.some((s) => s.topics.length > 0) && (
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-4">📌 Weak Topics (below 50%)</h2>
            <div className="flex flex-col gap-3">
              {formattedWeakTopics
                .filter((s) => s.topics.length > 0)
                .map((s, i) => (
                  <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="font-semibold text-yellow-800 mb-2">{s.subject}</p>
                    <ul className="list-disc list-inside space-y-1">
                      {s.topics.map((topic, j) => (
                        <li key={j} className="text-sm text-gray-700">{topic}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex gap-4 justify-center">
        <button onClick={() => setReviewMode(true)} className="bg-purple-600 text-white px-6 py-3 rounded font-semibold">
          Review Answers
        </button>
        <button onClick={onRestart} className="bg-blue-600 text-white px-6 py-3 rounded font-semibold">
          Restart
        </button>
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className={`px-6 py-3 rounded font-semibold text-white transition ${downloading ? "bg-green-400 cursor-wait" : "bg-green-600 hover:bg-green-700"}`}
        >
          {downloading ? "Generating PDF..." : "⬇ Download Report"}
        </button>
      </div>

    </div>
  );
}