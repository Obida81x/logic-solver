import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: "gemini-2.0-flash" });
}

const SYSTEM_PROMPT = `You are an expert digital logic professor and circuit designer. Your job is to analyze logic design problems written in natural language, solve them completely, and explain every step in both English AND Arabic.

You MUST respond with a valid JSON object (no markdown, no code blocks, just raw JSON) following this exact structure:

{
  "problemType": "boolean" | "mux" | "kmap" | "halfadder" | "fulladder" | "decoder" | "minterms",
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
      "content": "English explanation of this step — conversational, like explaining to a friend. Use 'Notice that...', 'This means...'",
      "contentAr": "الشرح بالعربي — بأسلوب بسيط. استخدم 'يعني هون...', 'لاحظ إنو...'"
    }
  ],
  "truthTable": [
    { "inputs": {"A": 0, "B": 0, "C": 0}, "output": 0, "mintermIndex": 0, "notes": "" }
  ],
  "simplificationSteps": [
    {
      "lawName": "Uniting Law",
      "lawNameAr": "قانون الضم",
      "before": "ABD + A'BD",
      "after": "BD",
      "explanation": "Combined ABD and A'BD — since A + A' = 1, we eliminate A.",
      "explanationAr": "ضمنا ABD و A'BD — لأن A + A' = 1 فنحذف A."
    }
  ],
  "costBefore": { "gateCost": 4, "literalCost": 11, "inputCost": 14 },
  "costAfter": { "gateCost": 1, "literalCost": 2, "inputCost": 2 },
  "muxDetails": null
}

For MUX problems, populate "muxDetails":
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
1. Always include ALL 6 steps (Understand, Truth Table, Simplification, Expression, Circuit description, Summary)
2. Truth table must include ALL 2^n rows for n variables
3. Simplification steps must name the Boolean law used (Uniting Law, De Morgan's, Absorption Law, Distribution Law, etc.)
4. Arabic explanations must be natural Syrian/Palestinian university-student Arabic dialect, not formal
5. For MUX: clearly show which Im is selected for each input combination, and the output for D=0 and D=1
6. The "expression" field must be the FULLY SIMPLIFIED minimal SOP expression
7. Cost criteria: count gates (AND/OR/NOT = 1 each), literals (variables in the unsimplified form), input cost (sum of all gate inputs)
8. NEVER include markdown formatting, code blocks, or explanation outside the JSON
9. The response must be parseable by JSON.parse() directly`;

router.post("/solve", async (req, res) => {
  try {
    const { problem } = req.body as { problem: string };

    if (!problem || typeof problem !== "string" || problem.trim().length < 5) {
      res.status(400).json({ error: "Please provide a valid problem description." });
      return;
    }

    const model = getGemini();
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: `Solve this digital logic problem completely. Respond with JSON only:\n\n${problem.trim()}` },
    ]);

    const raw = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        req.log.error({ raw }, "Failed to parse Gemini response as JSON");
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
