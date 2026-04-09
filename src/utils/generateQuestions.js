export async function generateQuestions(chapters, count, sectionName = "General") {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: `Generate ${count} NEET MCQs from ${chapters.join(", ")}.

For EACH question, include chapter name.

Format strictly:
Chapter: <chapter name>
1. Question
a) option
b) option
c) option
d) option
Answer: a/b/c/d

No extra text.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("API ERROR:", err);
      throw new Error("API failed");
    }

    const data = await res.json();
    let text = data?.choices?.[0]?.message?.content || "";

    text = text.replace(/\*\*/g, "").trim();

    // =========================
    // SPLIT QUESTIONS
    // =========================
    let blocks = text.split(/(?=Chapter:)/i);
    blocks = blocks.filter((b) => b.trim().length > 0);

    const questions = blocks.map((block) => {
      const lines = block.split("\n").map((l) => l.trim());

      // ✅ EXTRACT CHAPTER
      const chapterLine = lines.find((l) =>
        l.toLowerCase().startsWith("chapter")
      );
      const chapter = chapterLine
        ? chapterLine.split(":")[1]?.trim()
        : "General";

      // QUESTION
      const questionLine = lines.find((l) => /^\d+\./.test(l));
      const question = questionLine?.replace(/^\d+\.\s*/, "") || "";

      // OPTIONS
      const rawOptions = lines
        .filter((l) => /^[a-d]\)/i.test(l))
        .map((l) => l.slice(2).trim());

      // ANSWER
      const answerLine = lines.find((l) =>
        l.toLowerCase().includes("answer")
      );

      let correct = rawOptions[0];

      if (answerLine) {
        const match = answerLine.match(/[a-d]/i);
        if (match) {
          const index = ["a", "b", "c", "d"].indexOf(
            match[0].toLowerCase()
          );
          if (index !== -1 && rawOptions[index]) {
            correct = rawOptions[index];
          }
        }
      }

      // =========================
      // SHUFFLE OPTIONS
      // =========================
      const shuffled = [...rawOptions].sort(() => Math.random() - 0.5);

      return {
        question,
        options: shuffled,
        answer: correct.trim(),
        section: sectionName,
        chapter // ✅ REAL CHAPTER
      };
    });

    return questions.slice(0, count);

  } catch (err) {
    console.error("Groq Error:", err);

    return Array.from({ length: count }).map((_, i) => {
      const options = ["Option A", "Option B", "Option C", "Option D"];
      const shuffled = [...options].sort(() => Math.random() - 0.5);

      return {
        question: `Fallback Question ${i + 1}`,
        options: shuffled,
        answer: shuffled[0],
        section: sectionName,
        chapter: chapters[0] || "General" // fallback
      };
    });
  }
}