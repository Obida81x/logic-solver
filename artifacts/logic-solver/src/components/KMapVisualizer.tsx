import React from 'react';
import { TruthTableRow } from '../lib/booleanLogic';

export const KMapVisualizer: React.FC<{ minterms: number[], variables: string[], dontCares?: number[] }> = ({ minterms, variables, dontCares = [] }) => {
  const numVars = variables.length;

  if (numVars > 4 || numVars < 2) {
    return (
      <div className="p-6 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
        K-Map visualization is currently only supported for 2, 3, or 4 variables. (Current: {numVars} variables)
      </div>
    );
  }

  // Setup grid config based on numVars
  let rows = 2, cols = 2;
  let rowVars = [variables[0]];
  let colVars = [variables[1]];
  let grayRows = ['0', '1'];
  let grayCols = ['0', '1'];

  if (numVars === 3) {
    rows = 2; cols = 4;
    rowVars = [variables[0]];
    colVars = [variables[1], variables[2]];
    grayCols = ['00', '01', '11', '10'];
  } else if (numVars === 4) {
    rows = 4; cols = 4;
    rowVars = [variables[0], variables[1]];
    colVars = [variables[2], variables[3]];
    grayRows = ['00', '01', '11', '10'];
    grayCols = ['00', '01', '11', '10'];
  }

  // Calculate minterm mapping
  const getMintermIndex = (r: number, c: number) => {
    const bin = grayRows[r] + grayCols[c];
    return parseInt(bin, 2);
  };

  const isMinterm = (idx: number) => minterms.includes(idx);
  const isDontCare = (idx: number) => dontCares.includes(idx);

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-100 border-b pb-2">Karnaugh Map</h3>
      
      <div className="inline-block relative">
        {/* Top-left diagonal label */}
        <div className="absolute top-0 left-0 w-16 h-12 border-b border-r border-slate-300 relative">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" className="text-slate-300" strokeWidth="1"/>
          </svg>
          <span className="absolute bottom-1 left-2 text-xs font-bold text-slate-600">{rowVars.join('')}</span>
          <span className="absolute top-1 right-2 text-xs font-bold text-slate-600">{colVars.join('')}</span>
        </div>

        <div className="flex">
          {/* Top headers */}
          <div className="w-16 h-12"></div>
          <div className="flex border-b border-slate-300">
            {grayCols.map((c, i) => (
              <div key={i} className="w-16 h-12 flex items-center justify-center font-mono font-bold text-slate-600 border-r border-slate-200 last:border-r-0">
                {c}
              </div>
            ))}
          </div>
        </div>

        {grayRows.map((r, rowIdx) => (
          <div key={rowIdx} className="flex border-b border-slate-200 last:border-b-0">
            {/* Left headers */}
            <div className="w-16 h-16 flex items-center justify-center font-mono font-bold text-slate-600 border-r border-slate-300">
              {r}
            </div>
            {/* Cells */}
            <div className="flex relative">
              {grayCols.map((c, colIdx) => {
                const idx = getMintermIndex(rowIdx, colIdx);
                const val = isMinterm(idx) ? '1' : isDontCare(idx) ? 'X' : '0';
                const isActive = val === '1';
                
                return (
                  <div key={colIdx} className={`w-16 h-16 relative border-r border-slate-200 last:border-r-0 flex items-center justify-center text-xl font-bold font-mono transition-colors duration-200
                    ${isActive ? 'bg-teal-100 text-teal-800' : val === 'X' ? 'bg-slate-100 text-slate-500' : 'bg-white text-slate-300'}`}>
                    
                    {val}
                    
                    {/* Small minterm index */}
                    <span className="absolute bottom-1 right-1 text-[10px] text-slate-400 font-normal opacity-70">
                      m{idx}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {minterms.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-100">
          <h4 className="font-semibold text-slate-700 mb-3">Prime Implicants & Groups:</h4>
          <div className="flex gap-4 flex-wrap">
            <div className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded text-sm font-medium">
              Check Simplification steps tab for full reduction.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
