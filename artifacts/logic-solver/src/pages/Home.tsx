import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { extractVariables, generateTruthTable, quineMcCluskey, getCostCriteria, TruthTableRow, QMResult } from '../lib/booleanLogic';
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
}

export default function Home() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [problemType, setProblemType] = useState('boolean');
  const [inputExpr, setInputExpr] = useState('');
  const [result, setResult] = useState<SolveResult | null>(null);

  const t = {
    title: lang === 'ar' ? 'حل دوائر المنطق' : 'Logic Circuit Solver',
    desc: lang === 'ar' ? 'أداة تفاعلية لحل وتبسيط دوائر المنطق الرقمي.' : 'Interactive tool for solving and simplifying digital logic circuits.',
    typeLabel: lang === 'ar' ? 'نوع المسألة' : 'Problem Type',
    inputLabel: lang === 'ar' ? 'أدخل المسألة' : 'Enter Problem',
    solveBtn: lang === 'ar' ? 'حل المسألة' : 'Solve Problem',
    steps: lang === 'ar' ? 'الخطوات' : 'Steps',
    table: lang === 'ar' ? 'جدول الحقيقة' : 'Truth Table',
    circuit: lang === 'ar' ? 'الدارة' : 'Circuit',
    kmap: lang === 'ar' ? 'خريطة كارنوف' : 'K-Map',
    examples: lang === 'ar' ? 'أمثلة' : 'Examples',
  };

  const handleSolve = () => {
    if (!inputExpr.trim()) return;

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
      // Parse F(A,B,C) = Σ(1,3,5,7) d(0,2)
      const sumMatch = expr.match(/Σ\(([\d,\s]+)\)/);
      if (sumMatch) {
        minterms = sumMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      }
      const dMatch = expr.match(/d\(([\d,\s]+)\)/);
      if (dMatch) {
        dontCares = dMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      }
      
      // Need to re-generate truth table based on minterms if vars are known
      const maxVal = Math.max(...minterms, ...dontCares, 0);
      const neededVars = Math.max(vars.length, Math.ceil(Math.log2(maxVal + 1)));
      if (vars.length < neededVars) {
        vars = ['A','B','C','D','E','F'].slice(0, neededVars);
      }
      
      const numRows = Math.pow(2, vars.length);
      for (let i = 0; i < numRows; i++) {
        const inputs: Record<string, number> = {};
        for (let j = 0; j < vars.length; j++) {
          inputs[vars[j]] = (i >> (vars.length - 1 - j)) & 1;
        }
        truthTable.push({ inputs, output: minterms.includes(i) ? 1 : 0, mintermIndex: i });
      }
      // Reconstruct original expr as SOP of minterms
      originalExpr = minterms.map(m => {
        return vars.map((v, i) => ((m >> (vars.length - 1 - i)) & 1) ? v : `${v}'`).join('');
      }).join(' + ');
      
    } else if (problemType === 'halfadder') {
      vars = ['A', 'B'];
      // Just hardcode HA result for S
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
      variables: vars,
      originalExpr,
      simplifiedExpr,
      truthTable,
      minterms,
      dontCares,
      qmResult,
      costBefore,
      costAfter
    });
  };

  return (
    <div className={`min-h-[100dvh] flex flex-col md:flex-row bg-slate-50 text-slate-900 ${lang === 'ar' ? 'rtl font-sans' : 'ltr font-sans'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Left Panel */}
      <div className="w-full md:w-1/3 md:min-w-[320px] p-6 border-r border-slate-200 bg-white shadow-sm z-10 flex flex-col h-screen overflow-y-auto shrink-0">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-teal-700 tracking-tight">{t.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{t.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <Label className={`text-xs font-bold ${lang==='en'?'text-teal-600':'text-slate-400'}`}>EN</Label>
            <Switch checked={lang === 'ar'} onCheckedChange={(c) => setLang(c ? 'ar' : 'en')} />
            <Label className={`text-xs font-bold ${lang==='ar'?'text-teal-600':'text-slate-400'}`}>عربي</Label>
          </div>
        </div>

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <Label className="font-semibold text-slate-700">{t.typeLabel}</Label>
            <Select value={problemType} onValueChange={setProblemType}>
              <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-teal-500">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boolean">Boolean Expression</SelectItem>
                <SelectItem value="minterms">Minterms/Maxterms</SelectItem>
                <SelectItem value="halfadder">Half Adder (Sum)</SelectItem>
                <SelectItem value="fulladder">Full Adder (Sum)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-slate-700">{t.inputLabel}</Label>
            <Textarea 
              value={inputExpr}
              onChange={(e) => setInputExpr(e.target.value)}
              placeholder={problemType === 'minterms' ? "F(A,B,C) = Σ(1,3,5,7)" : "e.g. ABC'D + A'BD + ABCD"}
              className="font-mono h-32 resize-none bg-slate-50 border-slate-200 focus:ring-teal-500 text-lg p-4"
              dir="ltr"
            />
          </div>

          <Button 
            className="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/25 py-6 text-lg font-bold" 
            onClick={handleSolve}
          >
            {t.solveBtn}
          </Button>

          <div className="pt-8 border-t border-slate-100">
            <Label className="text-slate-500 font-semibold mb-4 block uppercase tracking-wider text-xs">{t.examples}</Label>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start text-left font-mono text-xs hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50" onClick={() => { setProblemType('boolean'); setInputExpr("AB' + BC + A'C"); }}>F = AB' + BC + A'C</Button>
              <Button variant="outline" className="justify-start text-left font-mono text-xs hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50" onClick={() => { setProblemType('boolean'); setInputExpr("ABC'D + A'BD + ABCD"); }}>F = ABC'D + A'BD + ABCD</Button>
              <Button variant="outline" className="justify-start text-left font-mono text-xs hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50" onClick={() => { setProblemType('minterms'); setInputExpr("F(A,B,C) = Σ(1,3,5,7)"); }}>F(A,B,C) = Σ(1,3,5,7)</Button>
              <Button variant="outline" className="justify-start text-left font-mono text-xs hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50" onClick={() => { setProblemType('halfadder'); setInputExpr("Half Adder"); }}>Half Adder</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-2/3 p-4 md:p-8 h-screen overflow-y-auto bg-slate-100">
        {!result ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <div className="w-32 h-32 mb-8 rounded-full bg-teal-50/50 flex items-center justify-center shadow-inner border border-teal-100/50">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-teal-600/50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-400 mb-3 tracking-tight">
              {lang === 'ar' ? 'أدخل المسألة للبدء' : 'Ready to Solve'}
            </h2>
            <p className="text-base max-w-md text-center text-slate-400">
              {lang === 'ar' ? 'سيقوم التطبيق بتوليد جدول الحقيقة، خريطة كارنوف، والدارة المنطقية مع خطوات الحل التفصيلية.' : 'Enter a boolean expression or minterms to generate the truth table, K-Map, circuit diagram, and step-by-step simplification.'}
            </p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <Tabs defaultValue="steps" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-white p-1.5 mb-8 rounded-xl shadow-sm border border-slate-200">
                <TabsTrigger value="steps" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 rounded-lg py-2.5 font-semibold text-sm">{t.steps}</TabsTrigger>
                <TabsTrigger value="table" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 rounded-lg py-2.5 font-semibold text-sm">{t.table}</TabsTrigger>
                <TabsTrigger value="kmap" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 rounded-lg py-2.5 font-semibold text-sm">{t.kmap}</TabsTrigger>
                <TabsTrigger value="circuit" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 rounded-lg py-2.5 font-semibold text-sm">{t.circuit}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="steps" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Step 1 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{lang === 'ar' ? 'الخطوة 1: فهم المسألة' : 'Step 1: Understand the Problem'}</h3>
                  <div className="font-mono text-xl text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4 font-bold" dir="ltr">
                    F({result.variables.join(',')}) = {inputExpr}
                  </div>
                  <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-100 mb-2">
                    🔵 The expression contains {result.variables.length} variables. We'll map this to a Truth Table to visualize all possible states.
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 p-3 rounded-md text-sm border border-emerald-100" dir="rtl">
                    🟢 المعادلة تحتوي على {result.variables.length} متغيرات. سنقوم ببناء جدول الحقيقة لمعرفة المخرجات في كل الحالات.
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{lang === 'ar' ? 'الخطوة 2: جدول الحقيقة' : 'Step 2: Truth Table'}</h3>
                  <p className="text-slate-600 text-sm mb-4">
                    {lang === 'ar' ? 'نظرة سريعة على أول 4 صفوف. اضغط على تبويب جدول الحقيقة لرؤية الجدول كاملاً.' : 'Preview of the first 4 rows. See full table in the Truth Table tab.'}
                  </p>
                  
                  <div className="border rounded-lg overflow-hidden mb-4 bg-slate-50" dir="ltr">
                    <table className="w-full text-center text-sm">
                      <thead className="bg-slate-100 border-b">
                        <tr>
                          {result.variables.map(v => <th key={v} className="py-2">{v}</th>)}
                          <th className="py-2 text-purple-700 font-bold">F</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.truthTable.slice(0, 4).map((r, i) => (
                          <tr key={i} className="border-b last:border-0">
                            {result.variables.map(v => <td key={v} className="py-1.5">{r.inputs[v]}</td>)}
                            <td className="py-1.5 font-bold text-purple-600">{r.output}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm font-medium text-slate-700">Minterms (F=1): {result.minterms.length > 0 ? result.minterms.join(', ') : 'None'}</p>
                </div>

                {/* Step 3 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">{lang === 'ar' ? 'الخطوة 3: التبسيط' : 'Step 3: Simplification'}</h3>
                  
                  {result.qmResult.steps.length === 0 ? (
                    <p className="text-slate-600 italic">
                      {lang === 'ar' ? 'المعادلة مبسطة مسبقاً ولا تحتاج لخطوات إضافية.' : 'The expression is already minimal or cannot be simplified further.'}
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {result.qmResult.steps.map((step, idx) => (
                        <div key={idx} className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                          <div className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold mb-3">
                            {lang === 'ar' ? step.lawNameAr : step.lawName}
                          </div>
                          
                          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4 font-mono text-lg bg-white p-3 rounded-lg border border-orange-200 shadow-sm" dir="ltr">
                            <div className="text-slate-500 line-through decoration-orange-400 decoration-2">{step.before}</div>
                            <div className="hidden md:block text-orange-400 font-sans">→</div>
                            <div className="text-orange-700 font-bold">{step.after}</div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm text-slate-600 flex gap-2"><span className="text-blue-500">🔵</span> {step.explanation}</div>
                            <div className="text-sm text-slate-600 flex gap-2" dir="rtl"><span className="text-emerald-500">🟢</span> {step.explanationAr}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 4 & 6 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">{lang === 'ar' ? 'النتيجة النهائية والملخص' : 'Final Result & Summary'}</h3>
                  
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 mb-6">
                    <div className="text-sm text-teal-700 font-bold mb-2 uppercase tracking-wide">Simplified Expression</div>
                    <div className="font-mono text-3xl font-black text-teal-900" dir="ltr">F = {result.simplifiedExpr || '0'}</div>
                  </div>

                  <table className="w-full text-left text-sm" dir="ltr">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-slate-500">
                        <th className="py-3 font-semibold uppercase">Measure</th>
                        <th className="py-3 font-semibold uppercase">Before</th>
                        <th className="py-3 font-semibold uppercase">After</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-100">
                        <td className="py-3 font-medium">Gate Cost (Count)</td>
                        <td className="py-3 font-mono">{result.costBefore.gateCost}</td>
                        <td className="py-3 font-mono font-bold text-teal-600">{result.costAfter.gateCost}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-3 font-medium">Literal Cost</td>
                        <td className="py-3 font-mono">{result.costBefore.literalCost}</td>
                        <td className="py-3 font-mono font-bold text-teal-600">{result.costAfter.literalCost}</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium">Total Inputs</td>
                        <td className="py-3 font-mono">{result.costBefore.inputCost}</td>
                        <td className="py-3 font-mono font-bold text-teal-600">{result.costAfter.inputCost}</td>
                      </tr>
                    </tbody>
                  </table>
                  
                </div>

              </TabsContent>
              
              <TabsContent value="table" className="animate-in fade-in duration-500">
                <div className="bg-white p-2 md:p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-center" dir="ltr">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        {result.variables.map(v => <th key={v} className="py-4 px-2 md:px-4 text-slate-500 font-bold text-sm md:text-base">{v}</th>)}
                        <th className="py-4 px-2 md:px-4 text-teal-700 font-black text-sm md:text-base border-l border-slate-200 bg-slate-50 rounded-tr-lg">F</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.truthTable.map((row, i) => (
                        <tr key={i} className={`border-b border-slate-100 transition-colors ${row.output === 1 ? 'bg-teal-50/70 hover:bg-teal-100/50' : 'hover:bg-slate-50'}`}>
                          {result.variables.map(v => <td key={v} className={`py-3 px-2 md:px-4 font-mono text-sm md:text-base ${row.output===1?'text-teal-800 font-medium':'text-slate-600'}`}>{row.inputs[v]}</td>)}
                          <td className={`py-3 px-2 md:px-4 font-mono font-bold border-l border-slate-200 text-sm md:text-base ${row.output === 1 ? 'text-teal-600 bg-teal-100/30' : 'text-slate-400 bg-slate-50/50'}`}>
                            {row.output}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="kmap" className="animate-in fade-in duration-500">
                <KMapVisualizer minterms={result.minterms} dontCares={result.dontCares} variables={result.variables} />
              </TabsContent>

              <TabsContent value="circuit" className="animate-in fade-in duration-500">
                <CircuitVisualizer expression={result.simplifiedExpr} variables={result.variables} />
              </TabsContent>

            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
