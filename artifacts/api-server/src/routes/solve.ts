import { Router } from "express";

const router = Router();

const SYSTEM_PROMPT = `You are an expert digital logic professor and circuit designer. Your job is to analyze logic design problems written in natural language, solve them completely, and explain every step in both English AND Arabic.

You MUST respond with a valid JSON object (no markdown, no code blocks, just raw JSON) following this exact structure:

{
  "problemType": "boolean",
  "title": "Short problem title in English",
  "titleAr": "عنوان المسألة بالعربي",
  "variables": ["A", "B", "C"],
  "expression": "simplified Boolean expression e.g. BD or A'B + BC",
  "originalExpression": "the full unsimplified expression derived from the problem",
  "minterms": [0, 1, 3, 5],
  "dontCares": [],
  "steps": [
    {
      "number": 1,
      "title": "Understand the Problem",
      "titleAr": "فهم المسألة",
      "content": "English explanation — conversational. Use 'Notice that...', 'This means...'",
      "contentAr": "الشرح بالعربي — بأسلوب بسيط. استخدم 'يعني هون...', 'لاحظ إنو...'"
    }
  ],
  "truthTable": [
    { "inputs": {"A": 0, "B": 0, "C": 0}, "output": 0, "mintermIndex": 0 }
  ],
  "simplificationSteps": [
    {
      "lawName": "Uniting Law",
      "lawNameAr": "قانون الضم",
      "before": "ABD + A'BD",
      "after": "BD",
      "explanation": "Combined ABD and A'BD — A + A' = 1, so A is eliminated.",
      "explanationAr": "ضمنا ABD و A'BD — لأن A + A' = 1 فنحذف A."
    }
  ],
  "costBefore": { "gateCost": 4, "literalCost": 11, "inputCost": 14 },
  "costAfter": { "gateCost": 1, "literalCost": 2, "inputCost": 2 },
  "muxDetails": null
}

For MUX problems set muxDetails:
{
  "muxDetails": {
    "size": "8x1",
    "selectionInputs": {"S2": "A", "S1": "B", "S0": "C"},
    "dataInputs": {"I0": "D", "I1": "0", "I2": "0", "I3": "1", "I4": "D", "I5": "1", "I6": "D'", "I7": "0"},
    "dVariable": "D",
    "tableWithD": [
      {"A": 0, "B": 0, "C": 0, "selectedInput": "I0", "inputValue": "D", "FwhenD0": 0, "FwhenD1": 1}
    ],
    "finalExpression": "A'BC + AB'C' + AB'C + ABC'"
  }
}

RULES:
1. Always include ALL 6 steps (Understand, Truth Table, Simplification, Expression, Circuit, Summary)
2. Truth table must include ALL 2^n rows
3. Name the Boolean law in each simplification step
4. Arabic must be natural university-student dialect (Syrian/Palestinian)
5. "expression" must be the FULLY SIMPLIFIED minimal SOP expression
6. NEVER include markdown or code blocks — raw JSON only
7. Response must be parseable by JSON.parse() directly`;

router.post("/solve", async (req, res) => {
  try {
    const { problem } = req.body as { problem: string };

    if (!problem || typeof problem !== "string" || problem.trim().length < 5) {
      res.status(400).json({ error: "Please provide a valid problem description." });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GROQ_API_KEY is not configured." });
      return;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 8192,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Solve this digital logic problem. Respond with JSON only:\n\n${problem.trim()}` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      req.log.error({ status: response.status, errText }, "Groq API error");
      res.status(500).json({ error: "AI service error. Please try again." });
      return;
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const raw = data.choices[0]?.message?.content ?? "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        req.log.error({ raw }, "Failed to parse Groq response as JSON");
        res.status(500).json({ error: "Failed to parse AI response. Please try again." });
        return;
      }
    }

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Solve endpoint error");
    res.status(500).json({ error: "An error occurred while solving the problem. Please try again." });
  }
});

export default router;
