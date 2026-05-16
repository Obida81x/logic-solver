import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { extractVariables, generateTruthTable, quineMcCluskey, getCostCriteria, TruthTableRow, QMResult, SimplificationStep } from '../lib/booleanLogic';
import { CircuitVisualizer } from '../components/CircuitVisualizer';
import { KMapVisualizer } from '../components/KMapVisualizer';

interface SolveResult {
  variables: string[];
  originalExpr: string;
  simplifiedExpr: string;
  truthTable: TruthTableRow[];
  minterms: number[];
  dontCares: number[];
  qmResult: QMResult;
  costBefore: { gateCost: number; literalCost: number; inputCost: number };
  costAfter: { gateCost: number; literalCost: number; inputCost: number };
  mode: 'formula';
}

interface AIStep {
  number: number;
  title: string;
  titleAr: string;
  content: string;
  contentAr: string;
}

interface AISimplificationStep {
  lawName: string;
  lawNameAr: string;
  before: string;
  after: string;
  explanation: string;
  explanationAr: string;
}

interface MuxTableRow {
  A?: number; B?: number; C?: number;
  selectedInput: string;
  inputValue: string;
  FwhenD0: number;
  FwhenD1: number;
  [key: string]: number | string | undefined;
}

interface MuxDetails {
  size: string;
  selectionInputs: Record<string, string>;
  dataInputs: Record<string, string>;
  dVariable: string;
  tableWithD: MuxTableRow[];
  finalExpression: string;
}

interface AISolveResult {
  mode: 'ai';
  problemType: string;
  title: string;
  titleAr: string;
  variables: string[];
  expression: string;
  originalExpression: string;
  minterms: number[];
  dontCares: number[];
  steps: AIStep[];
  truthTable: TruthTableRow[];
  simplificationSteps: AISimplificationStep[];
  costBefore: { gateCost: number; literalCost: number; inputCost: number };
  costAfter: { gateCost: number; literalCost: number; inputCost: number };
  muxDetails: MuxDetails | null;
}

type Result = SolveResult | AISolveResult;

const STEP_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500'];

const AI_EXAMPLES = [
  "An 8x1 MUX has A, B, and C connected to S2, S1, S0. I0=I4=D, I1=I2=I7=0, I3=I5=1, I6=D'",
  "Design a circuit that outputs 1 when the 3-bit input is greater than 3",
  "Simplify F = ABC'D + A'BD + ABCD using Boolean algebra and show each step",
  "A full adder has inputs A, B, and Cin. Find Sum and Carry-out expressions",
];

export default function Home() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [inputMode, setInputMode] = useState<'formula' | 'ai'>('formula');
  const [problemType, setProblemType] = useState('boolean');
  const [inputExpr, setInputExpr] = useState('');
  const [aiProblem, setAiProblem] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: lang === 'ar' ? 'حل دوائر المنطق' : 'Logic Circuit Solver',
    desc: lang === 'ar' ? 'أداة تفاعلية لحل وتبسيط دوائر المنطق الرقمي.' : 'Interactive tool for solving and simplifying digital logic circuits.',
    solveBtn: lang === 'ar' ? 'حل المسألة' : 'Solve Problem',
    steps: lang === 'ar' ? 'الخطوات' : 'Steps',
    table: lang === 'ar' ? 'جدول الحقيقة' : 'Truth Table',
    circuit: lang === 'ar' ? 'الدارة' : 'Circuit',
    kmap: lang === 'ar' ? 'خريطة كارنوف' : 'K-Map',
  };

  // ── Formula Mode Solver ──────────────────────────────────────────────────
  const handleFormulaSolve = () => {
    if (!inputExpr.trim()) return;
    setError(null);

    let expr = inputExpr;
    let vars = extractVariables(expr);
    let minterms: number[] = [];
    let dontCares: number[] = [];
    let originalExpr = expr;
    let truthTable: TruthTableRow[] = [];

    if (problemType === 'boolean') {
      truthTable = generateTruthTable(expr, vars);
      minterms = truthTable.filter(r => r.output === 1).map(r => r.mintermIndex);
    } else if (problemType === 'minterms') {
      const sumMatch = expr.match(/Σ\(([\d,\s]+)\)/);
      if (sumMatch) minterms = sumMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      const dMatch = expr.match(/d\(([\d,\s]+)\)/);
      if (dMatch) dontCares = dMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      const maxVal = Math.max(...minterms, ...dontCares, 0);
      const neededVars = Math.max(vars.length, Math.ceil(Math.log2(maxVal + 1)));
      if (vars.length < neededVars) vars = ['A','B','C','D','E','F'].slice(0, neededVars);
      const numRows = Math.pow(2, vars.length);
      for (let i = 0; i < numRows; i++) {
        const inputs: Record<string, number> = {};
        for (let j = 0; j < vars.length; j++) inputs[vars[j]] = (i >> (vars.length - 1 - j)) & 1;
        truthTable.push({ inputs, output: minterms.includes(i) ? 1 : 0, mintermIndex: i });
      }
      originalExpr = minterms.map(m => vars.map((v, i) => ((m >> (vars.length - 1 - i)) & 1) ? v : `${v}'`).join('')).join(' + ');
    } else if (problemType === 'halfadder') {
      vars = ['A', 'B'];
      originalExpr = "A'B + AB'";
      truthTable = generateTruthTable(originalExpr, vars);
      minterms = [1, 2];
    } else if (problemType === 'fulladder') {
      vars = ['A', 'B', 'Cin'];
      originalExpr = "A'B'Cin + A'BCin' + AB'Cin' + ABCin";
      truthTable = generateTruthTable(originalExpr, vars);
      minterms = [1, 2, 4, 7];
    }

    const qmResult = quineMcCluskey(minterms, vars, dontCares);
    const simplifiedExpr = qmResult.simplifiedSOP;
    const costBefore = getCostCriteria(originalExpr, vars);
    const costAfter = getCostCriteria(simplifiedExpr, vars);

    setResult({
      mode: 'formula',
      variables: vars,
      originalExpr,
      simplifiedExpr,
      truthTable,
      minterms,
      dontCares,
      qmResult,
      costBefore,
      costAfter,
    });
  };

  // ── AI Mode Solver ──────────────────────────────────────────────────────
  const handleAISolve = async () => {
    if (!aiProblem.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: aiProblem }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || 'Server error');
      }

      const data = await res.json() as Omit<AISolveResult, 'mode'>;
      setResult({ ...data, mode: 'ai' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSolve = () => {
    if (inputMode === 'ai') handleAISolve();
    else handleFormulaSolve();
  };

  const getDisplayTruthTable = (): TruthTableRow[] => {
    if (!result) return [];
    return result.truthTable;
  };
  const getDisplayVariables = (): string[] => result?.variables ?? [];
  const getDisplayMinterms = (): number[] => result?.minterms ?? [];
  const getDisplayDontCares = (): number[] => result?.dontCares ?? [];
  const getSimplifiedExpr = (): string => {
    if (!result) return '';
    if (result.mode === 'ai') return result.expression;
    return result.simplifiedExpr;
  };

  const renderStepsTab = () => {
    if (!result) return null;

    if (result.mode === 'ai') {
      return (
        <div className="space-y-5">
          {result.steps.map((step, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${STEP_COLORS[idx % STEP_COLORS.length]}`} />
              <div className="p-6">
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Step {step.number}: {lang === 'ar' ? step.titleAr : step.title}
                </h3>
                <div className="mt-3 space-y-2">
                  <div className="bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100 text-sm leading-relaxed">
                    <span className="mr-1">🔵</span>{step.content}
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-100 text-sm leading-relaxed" dir="rtl">
                    <span className="ml-1">🟢</span>{step.contentAr}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {result.simplificationSteps && result.simplificationSteps.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500" />
              <div className="p-6">
                <h3 className="text-base font-bold text-slate-800 mb-4">
                  {lang === 'ar' ? 'خطوات التبسيط التفصيلية' : 'Detailed Simplification Steps'}
                </h3>
                <div className="space-y-4">
                  {result.simplificationSteps.map((step, idx) => (
                    <div key={idx} className="bg-orange-50/60 rounded-xl border border-orange-100 p-4">
                      <span className="inline-block px-3 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-bold mb-3">
                        {lang === 'ar' ? step.lawNameAr : step.lawName}
                      </span>
                      <div className="flex flex-col md:flex-row md:items-center gap-3 font-mono text-base bg-white p-3 rounded-lg border border-orange-200 mb-3" dir="ltr">
                        <span className="text-slate-400 line-through decoration-orange-400 decoration-2">{step.before}</span>
                        <span className="text-orange-400 hidden md:block">→</span>
                        <span className="text-orange-700 font-bold">{step.after}</span>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex gap-2"><span>🔵</span><span className="text-slate-600">{step.explanation}</span></div>
                        <div className="flex gap-2" dir="rtl"><span>🟢</span><span className="text-slate-600">{step.explanationAr}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500" />
            <div className="p-6">
              <h3 className="text-base font-bold text-slate-800 mb-4">{lang === 'ar' ? 'الملخص النهائي' : 'Final Summary'}</h3>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 mb-5">
                <div className="text-xs text-teal-700 font-bold uppercase tracking-wider mb-1">Simplified Expression</div>
                <div className="font-mono text-2xl font-black text-teal-900" dir="ltr">F = {result.expression}</div>
              </div>
              <table className="w-full text-sm" dir="ltr">
                <thead><tr className="border-b-2 border-slate-200 text-slate-500">
                  <th className="py-2 text-left font-semibold uppercase">Measure</th>
                  <th className="py-2 text-center font-semibold uppercase">Before</th>
                  <th className="py-2 text-center font-semibold uppercase">After</th>
                </tr></thead>
                <tbody className="text-slate-700">
                  <tr className="border-b border-slate-100"><td className="py-2.5">Gate Cost</td><td className="py-2.5 text-center font-mono">{result.costBefore.gateCost}</td><td className="py-2.5 text-center font-mono font-bold text-teal-600">{result.costAfter.gateCost}</td></tr>
                  <tr className="border-b border-slate-100"><td className="py-2.5">Literal Cost</td><td className="py-2.5 text-center font-mono">{result.costBefore.literalCost}</td><td className="py-2.5 text-center font-mono font-bold text-teal-600">{result.costAfter.literalCost}</td></tr>
                  <tr><td className="py-2.5">Total Inputs</td><td className="py-2.5 text-center font-mono">{result.costBefore.inputCost}</td><td className="py-2.5 text-center font-mono font-bold text-teal-600">{result.costAfter.inputCost}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {result.muxDetails && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
              <div className="p-6">
                <h3 className="text-base font-bold text-slate-800 mb-4">
                  {lang === 'ar' ? `تفاصيل المتعدد ${result.muxDetails.size}` : `${result.muxDetails.size} MUX Details`}
                </h3>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <div className="text-xs font-bold text-indigo-700 uppercase mb-2">Selection Inputs</div>
                    {Object.entries(result.muxDetails.selectionInputs).map(([s, v]) => (
                      <div key={s} className="font-mono text-sm text-slate-700">{s} ← {v}</div>
                    ))}
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <div className="text-xs font-bold text-indigo-700 uppercase mb-2">Data Inputs</div>
                    <div className="grid grid-cols-2 gap-x-4">
                      {Object.entries(result.muxDetails.dataInputs).map(([inp, val]) => (
                        <div key={inp} className="font-mono text-sm text-slate-700">{inp} = {val}</div>
                      ))}
                    </div>
                  </div>
                </div>
                {result.muxDetails.tableWithD.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-center" dir="ltr">
                      <thead className="bg-slate-100 border-b">
                        <tr>
                          {result.variables.map(v => <th key={v} className="py-2 px-3">{v}</th>)}
                          <th className="py-2 px-3 text-indigo-700">Selected Im</th>
                          <th className="py-2 px-3 text-indigo-700">Input Value</th>
                          <th className="py-2 px-3 text-slate-500">F (D=0)</th>
                          <th className="py-2 px-3 text-teal-700 font-bold">F (D=1)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.muxDetails.tableWithD.map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            {result.variables.map(v => <td key={v} className="py-2 px-3 font-mono">{row[v] as number}</td>)}
                            <td className="py-2 px-3 font-mono text-indigo-600">{row.selectedInput}</td>
                            <td className="py-2 px-3 font-mono font-bold">{row.inputValue}</td>
                            <td className={`py-2 px-3 font-mono ${row.FwhenD0 ? 'text-teal-600 font-bold' : 'text-slate-400'}`}>{row.FwhenD0}</td>
                            <td className={`py-2 px-3 font-mono ${row.FwhenD1 ? 'text-teal-600 font-bold' : 'text-slate-400'}`}>{row.FwhenD1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Formula mode steps
    const r = result as SolveResult;
    return (
      <div className="space-y-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <h3 className="text-base font-bold text-slate-800 mb-2">{lang === 'ar' ? 'الخطوة 1: فهم المسألة' : 'Step 1: Understand the Problem'}</h3>
          <div className="font-mono text-xl bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4 font-bold" dir="ltr">F({r.variables.join(',')}) = {inputExpr}</div>
          <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-100 mb-2">🔵 The expression contains {r.variables.length} variables. We'll map this to a Truth Table to visualize all possible states.</div>
          <div className="bg-emerald-50 text-emerald-800 p-3 rounded-md text-sm border border-emerald-100" dir="rtl">🟢 المعادلة تحتوي على {r.variables.length} متغيرات. سنقوم ببناء جدول الحقيقة لمعرفة المخرجات في كل الحالات.</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
          <h3 className="text-base font-bold text-slate-800 mb-2">{lang === 'ar' ? 'الخطوة 2: جدول الحقيقة' : 'Step 2: Truth Table'}</h3>
          <p className="text-slate-600 text-sm mb-3">{lang === 'ar' ? 'أول 4 صفوف — الجدول الكامل في تبويب جدول الحقيقة.' : 'First 4 rows — see full table in the Truth Table tab.'}</p>
          <div className="border rounded-lg overflow-hidden mb-3 bg-slate-50" dir="ltr">
            <table className="w-full text-center text-sm">
              <thead className="bg-slate-100 border-b"><tr>{r.variables.map(v => <th key={v} className="py-2 px-3">{v}</th>)}<th className="py-2 px-3 text-purple-700 font-bold">F</th></tr></thead>
              <tbody>{r.truthTable.slice(0, 4).map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  {r.variables.map(v => <td key={v} className="py-1.5 px-3">{row.inputs[v]}</td>)}
                  <td className="py-1.5 px-3 font-bold text-purple-600">{row.output}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p className="text-sm font-medium text-slate-700">Minterms (F=1): {r.minterms.length > 0 ? r.minterms.join(', ') : 'None'}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500" />
          <h3 className="text-base font-bold text-slate-800 mb-4">{lang === 'ar' ? 'الخطوة 3: التبسيط' : 'Step 3: Simplification'}</h3>
          {r.qmResult.steps.length === 0 ? (
            <p className="text-slate-600 italic text-sm">{lang === 'ar' ? 'المعادلة مبسطة مسبقاً.' : 'Expression is already minimal.'}</p>
          ) : (
            <div className="space-y-4">
              {r.qmResult.steps.map((step: SimplificationStep, idx: number) => (
                <div key={idx} className="bg-orange-50/60 p-4 rounded-xl border border-orange-100">
                  <span className="inline-block px-3 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-bold mb-3">{lang === 'ar' ? step.lawNameAr : step.lawName}</span>
                  <div className="flex flex-col md:flex-row md:items-center gap-3 font-mono text-base bg-white p-3 rounded-lg border border-orange-200 mb-3" dir="ltr">
                    <span className="text-slate-400 line-through decoration-2">{step.before}</span>
                    <span className="text-orange-400 hidden md:block">→</span>
                    <span className="text-orange-700 font-bold">{step.after}</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-2"><span>🔵</span><span className="text-slate-600">{step.explanation}</span></div>
                    <div className="flex gap-2" dir="rtl"><span>🟢</span><span className="text-slate-600">{step.explanationAr}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500" />
          <h3 className="text-base font-bold text-slate-800 mb-4">{lang === 'ar' ? 'النتيجة النهائية والملخص' : 'Final Result & Summary'}</h3>
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 mb-5">
            <div className="text-xs text-teal-700 font-bold uppercase tracking-wider mb-1">Simplified Expression</div>
            <div className="font-mono text-2xl font-black text-teal-900" dir="ltr">F = {r.simplifiedExpr || '0'}</div>
          </div>
          <table className="w-full text-sm" dir="ltr">
            <thead><tr className="border-b-2 border-slate-200 text-slate-500"><th className="py-2 text-left font-semibold uppercase">Measure</th><th className="py-2 text-center font-semibold uppercase">Before</th><th className="py-2 text-center font-semibold uppercase">After</th></tr></thead>
            <tbody className="text-slate-700">
              <tr className="border-b border-slate-100"><td className="py-2.5">Gate Cost</td><td className="py-2.5 text-center font-mono">{r.costBefore.gateCost}</td><td className="py-2.5 text-center font-mono font-bold text-teal-600">{r.costAfter.gateCost}</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2.5">Literal Cost</td><td className="py-2.5 text-center font-mono">{r.costBefore.literalCost}</td><td className="py-2.5 text-center font-mono font-bold text-teal-600">{r.costAfter.literalCost}</td></tr>
              <tr><td className="py-2.5">Total Inputs</td><td className="py-2.5 text-center font-mono">{r.costBefore.inputCost}</td><td className="py-2.5 text-center font-mono font-bold text-teal-600">{r.costAfter.inputCost}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-[100dvh] flex flex-col md:flex-row bg-slate-50 text-slate-900 ${lang === 'ar' ? 'rtl font-sans' : 'ltr font-sans'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>

      {/* ── Left Panel ─────────────────────────────────────────────────── */}
      <div className="w-full md:w-1/3 md:min-w-[320px] p-6 border-r border-slate-200 bg-white shadow-sm z-10 flex flex-col h-screen overflow-y-auto shrink-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-black text-teal-700 tracking-tight">{t.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Label className={`text-xs font-bold ${lang==='en'?'text-teal-600':'text-slate-400'}`}>EN</Label>
            <Switch checked={lang === 'ar'} onCheckedChange={(c) => setLang(c ? 'ar' : 'en')} />
            <Label className={`text-xs font-bold ${lang==='ar'?'text-teal-600':'text-slate-400'}`}>عربي</Label>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-100 rounded-lg p-1 mb-5 gap-1">
          <button
            onClick={() => setInputMode('formula')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${inputMode === 'formula' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {lang === 'ar' ? 'صيغة رياضية' : 'Formula'}
          </button>
          <button
            onClick={() => setInputMode('ai')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${inputMode === 'ai' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <span className="text-base">✦</span>
            {lang === 'ar' ? 'اسأل بالكلام' : 'Ask in Words'}
          </button>
        </div>

        <div className="space-y-4 flex-1">
          {inputMode === 'formula' ? (
            <>
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 text-sm">{lang === 'ar' ? 'نوع المسألة' : 'Problem Type'}</Label>
                <Select value={problemType} onValueChange={setProblemType}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boolean">Boolean Expression</SelectItem>
                    <SelectItem value="minterms">Minterms / Σ Notation</SelectItem>
                    <SelectItem value="halfadder">Half Adder (Sum)</SelectItem>
                    <SelectItem value="fulladder">Full Adder (Sum)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 text-sm">{lang === 'ar' ? 'أدخل المعادلة' : 'Enter Expression'}</Label>
                <Textarea
                  value={inputExpr}
                  onChange={(e) => setInputExpr(e.target.value)}
                  placeholder={problemType === 'minterms' ? "F(A,B,C) = Σ(1,3,5,7)" : "e.g. ABC'D + A'BD + ABCD"}
                  className="font-mono h-28 resize-none bg-slate-50 border-slate-200 text-base p-3"
                  dir="ltr"
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSolve(); }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-700">
                <span className="font-semibold">✦ AI Mode —</span> {lang === 'ar' ? 'اكتب مسألتك بالكلام الطبيعي، والذكاء الاصطناعي يحلها لك خطوة بخطوة.' : 'Describe your problem in plain English or Arabic and AI will solve it step by step.'}
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 text-sm">{lang === 'ar' ? 'اكتب المسألة هنا' : 'Describe the Problem'}</Label>
                <Textarea
                  value={aiProblem}
                  onChange={(e) => setAiProblem(e.target.value)}
                  placeholder={lang === 'ar' ? "مثال: مضاعف 8×1 فيه A وB وC موصولة بـ S2 وS1 وS0..." : "e.g. An 8x1 MUX has A, B, C connected to S2, S1, S0. I0=I4=D, I1=I2=I7=0..."}
                  className="h-36 resize-none bg-slate-50 border-slate-200 text-sm p-3 leading-relaxed"
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSolve(); }}
                />
                <p className="text-xs text-slate-400">{lang === 'ar' ? 'Ctrl+Enter للحل السريع' : 'Ctrl+Enter to solve'}</p>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <Button
            className="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-500/20 py-5 text-base font-bold"
            onClick={handleSolve}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {lang === 'ar' ? 'يحلل المسألة...' : 'Analyzing...'}
              </span>
            ) : t.solveBtn}
          </Button>

          {/* Examples */}
          <div className="pt-4 border-t border-slate-100">
            <Label className="text-slate-400 font-semibold mb-3 block uppercase tracking-wider text-xs">
              {lang === 'ar' ? 'أمثلة' : 'Examples'}
            </Label>
            <div className="flex flex-col gap-1.5">
              {inputMode === 'formula' ? (
                <>
                  <button className="text-left font-mono text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors" onClick={() => { setProblemType('boolean'); setInputExpr("AB' + BC + A'C"); }}>F = AB' + BC + A'C</button>
                  <button className="text-left font-mono text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors" onClick={() => { setProblemType('boolean'); setInputExpr("ABC'D + A'BD + ABCD"); }}>F = ABC'D + A'BD + ABCD</button>
                  <button className="text-left font-mono text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors" onClick={() => { setProblemType('minterms'); setInputExpr("F(A,B,C) = Σ(1,3,5,7)"); }}>F(A,B,C) = Σ(1,3,5,7)</button>
                  <button className="text-left font-mono text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors" onClick={() => { setProblemType('halfadder'); setInputExpr("Half Adder"); }}>Half Adder</button>
                </>
              ) : (
                AI_EXAMPLES.map((ex, i) => (
                  <button key={i} className="text-left text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors leading-relaxed" onClick={() => setAiProblem(ex)}>{ex}</button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel ─────────────────────────────────────────────────── */}
      <div className="w-full md:w-2/3 p-4 md:p-8 h-screen overflow-y-auto bg-slate-100">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
              <svg className="animate-spin h-7 w-7 text-teal-600" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-600">{lang === 'ar' ? 'الذكاء الاصطناعي يحلل المسألة...' : 'AI is analyzing your problem...'}</p>
              <p className="text-sm mt-1">{lang === 'ar' ? 'يتم توليد الحل خطوة بخطوة' : 'Generating step-by-step solution'}</p>
            </div>
          </div>
        ) : !result ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <div className="w-28 h-28 mb-6 rounded-full bg-teal-50/50 flex items-center justify-center border border-teal-100/50">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-teal-500/60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-400 mb-2 tracking-tight">
              {lang === 'ar' ? 'أدخل المسألة للبدء' : 'Ready to Solve'}
            </h2>
            <p className="text-sm max-w-sm text-center leading-relaxed">
              {lang === 'ar'
                ? 'استخدم وضع الصيغة للمعادلات الرياضية، أو وضع الكلام لوصف المسألة بلغتك الطبيعية.'
                : 'Use Formula mode for math expressions, or Ask in Words to describe your problem naturally.'}
            </p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            {result.mode === 'ai' && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 shadow-sm flex items-start gap-3">
                <span className="text-xl mt-0.5">✦</span>
                <div>
                  <p className="font-bold text-slate-800">{lang === 'ar' ? result.titleAr : result.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{lang === 'ar' ? 'تم الحل بالذكاء الاصطناعي' : `Solved by AI · Problem type: ${result.problemType}`}</p>
                </div>
              </div>
            )}
            <Tabs defaultValue="steps" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-white p-1.5 mb-6 rounded-xl shadow-sm border border-slate-200">
                <TabsTrigger value="steps" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 rounded-lg py-2 font-semibold text-sm">{t.steps}</TabsTrigger>
                <TabsTrigger value="table" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 rounded-lg py-2 font-semibold text-sm">{t.table}</TabsTrigger>
                <TabsTrigger value="kmap" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 rounded-lg py-2 font-semibold text-sm">{t.kmap}</TabsTrigger>
                <TabsTrigger value="circuit" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 rounded-lg py-2 font-semibold text-sm">{t.circuit}</TabsTrigger>
              </TabsList>

              <TabsContent value="steps" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderStepsTab()}
              </TabsContent>

              <TabsContent value="table" className="animate-in fade-in duration-300">
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-center" dir="ltr">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        {getDisplayVariables().map(v => <th key={v} className="py-3 px-3 text-slate-500 font-bold text-sm">{v}</th>)}
                        <th className="py-3 px-3 text-teal-700 font-black text-sm border-l border-slate-200 bg-slate-50">F</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getDisplayTruthTable().map((row, i) => (
                        <tr key={i} className={`border-b border-slate-100 transition-colors ${row.output === 1 ? 'bg-teal-50/70 hover:bg-teal-100/50' : 'hover:bg-slate-50'}`}>
                          {getDisplayVariables().map(v => <td key={v} className={`py-2.5 px-3 font-mono text-sm ${row.output===1?'text-teal-800 font-medium':'text-slate-600'}`}>{row.inputs[v]}</td>)}
                          <td className={`py-2.5 px-3 font-mono font-bold border-l border-slate-200 text-sm ${row.output === 1 ? 'text-teal-600 bg-teal-100/30' : 'text-slate-400 bg-slate-50/50'}`}>{row.output}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="kmap" className="animate-in fade-in duration-300">
                <KMapVisualizer minterms={getDisplayMinterms()} dontCares={getDisplayDontCares()} variables={getDisplayVariables()} />
              </TabsContent>

              <TabsContent value="circuit" className="animate-in fade-in duration-300">
                <CircuitVisualizer expression={getSimplifiedExpr()} variables={getDisplayVariables()} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
