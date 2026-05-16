import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { generateTruthTable, simplifyExpression } from '../lib/booleanLogic';
import { CircuitVisualizer } from '../components/CircuitVisualizer';
import { KMapVisualizer } from '../components/KMapVisualizer';

export default function Home() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [problemType, setProblemType] = useState('boolean');
  const [inputExpr, setInputExpr] = useState('');
  const [solved, setSolved] = useState(false);

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
    setSolved(true);
  };

  const vars = ["A", "B", "C"];
  const truthTable = useMemo(() => solved ? generateTruthTable(inputExpr || 'A', vars) : [], [solved, inputExpr]);
  const simplified = useMemo(() => solved ? simplifyExpression(truthTable, vars) : '', [truthTable]);

  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Left Panel */}
      <div className="w-full md:w-1/3 p-6 border-r border-slate-200 bg-white shadow-sm z-10 flex flex-col h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-teal-700 tracking-tight">{t.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{t.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-slate-400">EN</Label>
            <Switch checked={lang === 'ar'} onCheckedChange={(c) => setLang(c ? 'ar' : 'en')} />
            <Label className="text-xs font-semibold text-slate-400">عربي</Label>
          </div>
        </div>

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <Label>{t.typeLabel}</Label>
            <Select value={problemType} onValueChange={setProblemType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boolean">Boolean Expression</SelectItem>
                <SelectItem value="truthtable">Truth Table</SelectItem>
                <SelectItem value="minterms">Minterms/Maxterms</SelectItem>
                <SelectItem value="mux">Multiplexer (MUX)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.inputLabel}</Label>
            <Textarea 
              value={inputExpr}
              onChange={(e) => setInputExpr(e.target.value)}
              placeholder="e.g. AB'C + A'BC"
              className="font-mono h-32 resize-none"
            />
          </div>

          <Button 
            className="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-500/20" 
            onClick={handleSolve}
            size="lg"
          >
            {t.solveBtn}
          </Button>

          <div className="pt-6 border-t border-slate-100">
            <Label className="text-slate-500 mb-3 block">{t.examples}</Label>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start text-left font-mono text-xs" onClick={() => { setProblemType('boolean'); setInputExpr("AB' + BC + A'C"); }}>F = AB' + BC + A'C</Button>
              <Button variant="outline" className="justify-start text-left font-mono text-xs" onClick={() => { setProblemType('boolean'); setInputExpr("ABC'D + A'BD + ABCD"); }}>F = ABC'D + A'BD + ABCD</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-2/3 p-6 h-screen overflow-y-auto bg-slate-50/50">
        {!solved ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <div className="w-24 h-24 mb-6 rounded-full bg-teal-50 flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-teal-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h2 className="text-xl font-medium text-slate-600 mb-2">
              {lang === 'ar' ? 'أدخل المسألة للبدء' : 'Enter a problem to begin'}
            </h2>
            <p className="text-sm max-w-md text-center">
              {lang === 'ar' ? 'سيقوم التطبيق بتوليد جدول الحقيقة، خريطة كارنوف، والدارة المنطقية مع خطوات الحل التفصيلية.' : 'The app will generate the truth table, K-Map, and logic circuit diagram along with detailed step-by-step solutions.'}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="steps" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-200/50 p-1 mb-6 rounded-lg">
              <TabsTrigger value="steps">{t.steps}</TabsTrigger>
              <TabsTrigger value="table">{t.table}</TabsTrigger>
              <TabsTrigger value="kmap">{t.kmap}</TabsTrigger>
              <TabsTrigger value="circuit">{t.circuit}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="steps" className="space-y-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{lang === 'ar' ? 'خطوات الحل' : 'Solution Steps'}</h3>
                
                <div className="space-y-6">
                  <div className="border-l-4 border-teal-500 pl-4 py-1">
                    <h4 className="font-semibold text-slate-700">1. Original Expression</h4>
                    <p className="font-mono text-lg text-teal-800 mt-1">{inputExpr}</p>
                    <div className="mt-3 bg-blue-50 text-blue-800 p-3 rounded text-sm">
                      🔵 Notice that the expression can be simplified using basic Boolean algebra.
                    </div>
                    <div className="mt-2 bg-green-50 text-green-800 p-3 rounded text-sm" dir="rtl">
                      🟢 لاحظ إنو ممكن نبسط المعادلة باستخدام قوانين الجبر البولياني الأساسية.
                    </div>
                  </div>

                  <div className="border-l-4 border-teal-500 pl-4 py-1">
                    <h4 className="font-semibold text-slate-700">2. Simplified Form</h4>
                    <p className="font-mono text-lg text-teal-800 mt-1">{simplified}</p>
                    <div className="mt-3 bg-blue-50 text-blue-800 p-3 rounded text-sm">
                      🔵 This is the minimal Sum of Products (SOP) form derived from the Truth Table.
                    </div>
                    <div className="mt-2 bg-green-50 text-green-800 p-3 rounded text-sm" dir="rtl">
                      🟢 هاد هو أبسط شكل (Sum of Products) طلعناه من جدول الحقيقة.
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="table">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      {vars.map(v => <th key={v} className="py-3 px-4 text-slate-600">{v}</th>)}
                      <th className="py-3 px-4 text-teal-700 font-bold border-l border-slate-200">Output (F)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {truthTable.map((row, i) => (
                      <tr key={i} className={`border-b border-slate-100 ${row.output === 1 ? 'bg-teal-50/50' : ''}`}>
                        {vars.map(v => <td key={v} className="py-2 px-4 font-mono text-slate-700">{row.inputs[v]}</td>)}
                        <td className={`py-2 px-4 font-mono font-bold border-l border-slate-200 ${row.output === 1 ? 'text-teal-600' : 'text-slate-400'}`}>
                          {row.output}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="kmap">
              <KMapVisualizer truthTable={truthTable} variables={vars} />
            </TabsContent>

            <TabsContent value="circuit">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <CircuitVisualizer expression={simplified} />
              </div>
            </TabsContent>

          </Tabs>
        )}
      </div>
    </div>
  );
}
