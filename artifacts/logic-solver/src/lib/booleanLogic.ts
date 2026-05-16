import { z } from "zod";

export type LogicVariable = string;

export interface TruthTableRow {
  inputs: Record<string, number>;
  output: number;
  mintermIndex: number;
}

export interface SimplificationStep {
  lawName: string;
  lawNameAr: string;
  before: string;
  after: string;
  explanation: string;
  explanationAr: string;
}

export interface QMResult {
  minterms: number[];
  dontCares: number[];
  primeImplicants: string[];
  essentialPI: string[];
  simplifiedSOP: string;
  steps: SimplificationStep[];
}

export function parseExpression(expr: string): string {
  let parsed = expr.replace(/\s+/g, '');
  if (parsed.startsWith('F=')) parsed = parsed.substring(2);
  else if (parsed.startsWith('f=')) parsed = parsed.substring(2);
  else if (parsed.includes('=')) {
    parsed = parsed.split('=')[1]; // handle F(A,B,C) = ...
  }
  return parsed;
}

export function extractVariables(expr: string): string[] {
  // If minterm notation like F(A,B,C) = Σ(...)
  if (expr.includes('(') && expr.includes(')') && expr.includes('Σ')) {
    const varMatch = expr.match(/\((.*?)\)/);
    if (varMatch) {
      return varMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  
  let parsed = parseExpression(expr);
  const vars = new Set<string>();
  for (let i = 0; i < parsed.length; i++) {
    const c = parsed[i];
    if (/[A-Za-z]/.test(c) && c !== 'v' && c !== 'F' && c !== 'f') { // simple heuristic, assuming 'v' isn't a variable if used in some keyword, but let's just allow A-Z
      // Actually just match uppercase A-Z or a-z except some keywords
      vars.add(c.toUpperCase());
    }
  }
  const arr = Array.from(vars).sort();
  return arr.length > 0 ? arr : ['A', 'B', 'C'];
}

export function evaluateExpression(expr: string, inputs: Record<string, number>): number {
  try {
    let parsed = parseExpression(expr);
    // Expand XOR
    parsed = parsed.replace(/⊕/g, '^').replace(/\^/g, ' !== ');
    
    // Replace X' with (!X)
    parsed = parsed.replace(/([A-Za-z0-9\)])'/g, '(!$1)');
    
    // Insert && between adjacent variables/parentheses
    parsed = parsed.replace(/([A-Za-z0-9\)])(?=[A-Za-z0-9\(])/g, '$1 && ');
    parsed = parsed.replace(/([A-Za-z0-9\)])(?=\(!)/g, '$1 && ');
    parsed = parsed.replace(/\)(?=[A-Za-z0-9])/g, ') && ');
    
    // Replace + with ||
    parsed = parsed.replace(/\+/g, ' || ');
    
    // case insensitive for variables mapping to inputs
    const keys = Object.keys(inputs);
    const values = Object.values(inputs).map(v => !!v);
    
    // Convert variables in parsed to match keys (uppercase)
    parsed = parsed.toUpperCase();
    
    const fn = new Function(...keys, `return (${parsed}) ? 1 : 0;`);
    return fn(...values);
  } catch (e) {
    return 0;
  }
}

export function generateTruthTable(expr: string, variables: string[]): TruthTableRow[] {
  const rows: TruthTableRow[] = [];
  const numVars = variables.length;
  const numRows = Math.pow(2, numVars);
  
  for (let i = 0; i < numRows; i++) {
    const inputs: Record<string, number> = {};
    for (let j = 0; j < numVars; j++) {
      inputs[variables[j]] = (i >> (numVars - 1 - j)) & 1;
    }
    const output = evaluateExpression(expr, inputs);
    rows.push({ inputs, output, mintermIndex: i });
  }
  return rows;
}

export function getCostCriteria(expr: string, variables: string[]) {
  if (!expr || expr === '0' || expr === '1') return { gateCost: 0, literalCost: 0, inputCost: 0 };
  
  const terms = expr.split('+').map(t => t.trim());
  let gateCost = terms.length > 1 ? 1 : 0; // OR gate for sum
  let literalCost = 0;
  let inputCost = 0;
  
  terms.forEach(term => {
    // count literals (variables)
    const literals = term.replace(/[^A-Za-z]/g, '').length;
    literalCost += literals;
    
    // AND gate if > 1 literal
    if (literals > 1) {
      gateCost += 1;
      inputCost += literals; // inputs to AND gate
    }
  });
  
  if (terms.length > 1) {
    inputCost += terms.length; // inputs to OR gate
  }
  
  return { gateCost, literalCost, inputCost };
}

// Basic Quine-McCluskey
export function quineMcCluskey(minterms: number[], variables: string[], dontCares: number[] = []): QMResult {
  const numVars = variables.length;
  
  if (minterms.length === 0) {
    return { minterms, dontCares, primeImplicants: [], essentialPI: [], simplifiedSOP: "0", steps: [] };
  }
  if (minterms.length + dontCares.length === Math.pow(2, numVars)) {
    return { minterms, dontCares, primeImplicants: [], essentialPI: [], simplifiedSOP: "1", steps: [] };
  }

  // Generate initial terms
  let groups: Record<number, { term: string, minterms: number[], used: boolean }[]> = {};
  
  for (const m of [...minterms, ...dontCares]) {
    const bin = m.toString(2).padStart(numVars, '0');
    const ones = (bin.match(/1/g) || []).length;
    if (!groups[ones]) groups[ones] = [];
    groups[ones].push({ term: bin, minterms: [m], used: false });
  }
  
  let primeImplicantsSet = new Set<string>();
  let piDetails: { term: string, minterms: number[] }[] = [];
  
  let steps: SimplificationStep[] = [];
  let currentPass = 1;
  
  while (Object.keys(groups).length > 0) {
    let nextGroups: Record<number, { term: string, minterms: number[], used: boolean }[]> = {};
    let matchedAny = false;
    let groupKeys = Object.keys(groups).map(Number).sort((a,b) => a-b);
    
    for (let i = 0; i < groupKeys.length - 1; i++) {
      let g1 = groups[groupKeys[i]];
      let g2 = groups[groupKeys[i+1]];
      
      if (!g1 || !g2) continue;
      
      for (let t1 of g1) {
        for (let t2 of g2) {
          let diffCount = 0;
          let diffIdx = -1;
          for (let c = 0; c < numVars; c++) {
            if (t1.term[c] !== t2.term[c]) {
              diffCount++;
              diffIdx = c;
            }
          }
          
          if (diffCount === 1) {
            t1.used = true;
            t2.used = true;
            matchedAny = true;
            let newTerm = t1.term.substring(0, diffIdx) + '-' + t1.term.substring(diffIdx + 1);
            let combinedMinterms = Array.from(new Set([...t1.minterms, ...t2.minterms])).sort((a,b) => a-b);
            
            let newOnes = (newTerm.match(/1/g) || []).length;
            if (!nextGroups[newOnes]) nextGroups[newOnes] = [];
            
            // avoid duplicates
            if (!nextGroups[newOnes].find(x => x.term === newTerm)) {
              nextGroups[newOnes].push({ term: newTerm, minterms: combinedMinterms, used: false });
              
              if (currentPass === 1 && steps.length < 5) {
                // Generate a uniting law step
                let t1Str = termToAlgebra(t1.term, variables);
                let t2Str = termToAlgebra(t2.term, variables);
                let newStr = termToAlgebra(newTerm, variables);
                
                let combined = t1Str + ' + ' + t2Str;
                let varEliminated = variables[diffIdx];
                
                steps.push({
                  lawName: "Uniting Law",
                  lawNameAr: "قانون الضم",
                  before: combined,
                  after: newStr,
                  explanation: `Combined ${t1Str} and ${t2Str} to eliminate ${varEliminated} since ${varEliminated} + ${varEliminated}' = 1.`,
                  explanationAr: `تم ضم ${t1Str} و ${t2Str} لحذف ${varEliminated} لأن ${varEliminated} + ${varEliminated}' = 1.`
                });
              }
            }
          }
        }
      }
    }
    
    // Collect unused as prime implicants
    for (const key of groupKeys) {
      for (let t of groups[key]) {
        if (!t.used) {
          if (!primeImplicantsSet.has(t.term)) {
            primeImplicantsSet.add(t.term);
            piDetails.push({ term: t.term, minterms: t.minterms });
          }
        }
      }
    }
    
    if (!matchedAny) break;
    groups = nextGroups;
    currentPass++;
  }
  
  // Find essential prime implicants
  let mintermCoverage: Record<number, string[]> = {};
  for (const m of minterms) {
    mintermCoverage[m] = [];
    for (const pi of piDetails) {
      if (pi.minterms.includes(m)) {
        mintermCoverage[m].push(pi.term);
      }
    }
  }
  
  let essentialPIs = new Set<string>();
  let coveredMinterms = new Set<number>();
  
  for (const m of minterms) {
    if (mintermCoverage[m].length === 1) {
      const epi = mintermCoverage[m][0];
      essentialPIs.add(epi);
      const piObj = piDetails.find(p => p.term === epi);
      if (piObj) {
        piObj.minterms.forEach(min => coveredMinterms.add(min));
      }
    }
  }
  
  // Simple greedy set cover for remaining
  let remainingPIs = piDetails.filter(p => !essentialPIs.has(p.term));
  let finalPIs = Array.from(essentialPIs);
  
  while (coveredMinterms.size < minterms.length) {
    let bestPI = null;
    let maxCoverage = 0;
    
    for (const pi of remainingPIs) {
      let coverCount = 0;
      for (const m of pi.minterms) {
        if (minterms.includes(m) && !coveredMinterms.has(m)) coverCount++;
      }
      if (coverCount > maxCoverage) {
        maxCoverage = coverCount;
        bestPI = pi;
      }
    }
    
    if (bestPI) {
      finalPIs.push(bestPI.term);
      for (const m of bestPI.minterms) {
        coveredMinterms.add(m);
      }
      remainingPIs = remainingPIs.filter(p => p.term !== bestPI.term);
    } else {
      break;
    }
  }
  
  let simplifiedSOP = finalPIs.map(t => termToAlgebra(t, variables)).join(' + ');
  
  // Add absorption/consensus steps heuristically if possible
  if (steps.length === 0 && finalPIs.length > 0) {
    steps.push({
      lawName: "Simplification",
      lawNameAr: "تبسيط",
      before: minterms.map(m => termToAlgebra(m.toString(2).padStart(numVars, '0'), variables)).join(' + '),
      after: simplifiedSOP,
      explanation: "Grouped minterms to form minimal SOP expression.",
      explanationAr: "تجميع الحدود للحصول على أبسط معادلة."
    });
  }

  return {
    minterms,
    dontCares,
    primeImplicants: piDetails.map(p => p.term),
    essentialPI: Array.from(essentialPIs),
    simplifiedSOP,
    steps
  };
}

function termToAlgebra(term: string, variables: string[]): string {
  let res = "";
  for (let i = 0; i < term.length; i++) {
    if (term[i] === '1') res += variables[i];
    else if (term[i] === '0') res += variables[i] + "'";
  }
  return res || "1";
}
