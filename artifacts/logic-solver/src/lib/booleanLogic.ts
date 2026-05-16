import { z } from "zod";

export type LogicVariable = "A" | "B" | "C" | "D";

export interface TruthTableRow {
  inputs: Record<string, number>;
  output: number;
}

// Convert expression like "AB'C + A'B" to executable JS
export function parseAndEvaluate(expr: string, inputs: Record<string, number>): number {
  try {
    let parsed = expr.replace(/\s+/g, '');
    
    // Replace XOR
    parsed = parsed.replace(/\^/g, ' !== ');
    
    // Replace prime with NOT. E.g. A' -> (!A)
    // We need to handle this carefully. Let's convert variables first.
    let jsExpr = parsed;
    
    // Replace X' with (!X)
    jsExpr = jsExpr.replace(/([A-Z])'/g, '(!$1)');
    
    // Insert && between adjacent variables/parentheses
    // E.g. AB -> A && B, A(!B) -> A && (!B), (!A)B -> (!A) && B, (!A)(!B) -> (!A) && (!B)
    jsExpr = jsExpr.replace(/([A-Z\)])(?=[A-Z\(])/g, '$1 && ');
    jsExpr = jsExpr.replace(/([A-Z\)])(?=\(!)/g, '$1 && ');
    
    // Replace + with ||
    jsExpr = jsExpr.replace(/\+/g, ' || ');
    
    // Evaluate safely
    const keys = Object.keys(inputs);
    const values = Object.values(inputs).map(v => !!v);
    
    // Create function
    const fn = new Function(...keys, `return (${jsExpr}) ? 1 : 0;`);
    return fn(...values);
  } catch (e) {
    return 0; // fallback
  }
}

export function generateTruthTable(expr: string, variables: string[] = ["A", "B", "C"]): TruthTableRow[] {
  const rows: TruthTableRow[] = [];
  const numVars = variables.length;
  const numRows = Math.pow(2, numVars);
  
  for (let i = 0; i < numRows; i++) {
    const inputs: Record<string, number> = {};
    for (let j = 0; j < numVars; j++) {
      inputs[variables[j]] = (i >> (numVars - 1 - j)) & 1;
    }
    const output = parseAndEvaluate(expr, inputs);
    rows.push({ inputs, output });
  }
  
  return rows;
}

// Basic Quine-McCluskey or simplification placeholder
export function simplifyExpression(truthTable: TruthTableRow[], variables: string[]): string {
  // For a fast implementation, we just return SOP of minterms or a basic simplification
  const minterms = truthTable.filter(r => r.output === 1);
  if (minterms.length === 0) return "0";
  if (minterms.length === Math.pow(2, variables.length)) return "1";
  
  // Return raw SOP as placeholder for full QM
  return minterms.map(row => {
    return variables.map(v => row.inputs[v] === 1 ? v : `${v}'`).join('');
  }).join(' + ');
}
