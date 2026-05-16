export type GateNode = 
  | { type: 'INPUT'; variable: string; value: number }
  | { type: 'NOT'; input: GateNode }
  | { type: 'AND'; inputs: GateNode[] }
  | { type: 'OR'; inputs: GateNode[] }
  | { type: 'NAND'; inputs: GateNode[] }
  | { type: 'NOR'; inputs: GateNode[] }
  | { type: 'XOR'; inputs: GateNode[] }
  | { type: 'XNOR'; inputs: GateNode[] };

export interface LayoutNode {
  id: string;
  gateNode: GateNode;
  x: number;
  y: number;
  width: number;
  height: number;
  inputPorts: { x: number; y: number }[];
  outputPort: { x: number; y: number };
}

export interface CircuitLayout {
  nodes: LayoutNode[];
  wires: { fromId: string; fromPort: number; toId: string; toPort: number; value?: number }[];
  width: number;
  height: number;
  inputPins: { variable: string; x: number; y: number; id: string }[];
  outputPin: { x: number; y: number; id: string };
}

// Basic recursive parser for SOP / simple expressions
export function parseToGateTree(expr: string): GateNode {
  if (!expr || expr === '0' || expr === '1') {
    return { type: 'INPUT', variable: expr || '0', value: 0 };
  }
  
  // Handle sum of products (e.g. "AB' + CD")
  const terms = expr.split('+').map(t => t.trim());
  if (terms.length > 1) {
    return {
      type: 'OR',
      inputs: terms.map(t => parseProductTerm(t))
    };
  }
  
  return parseProductTerm(terms[0]);
}

function parseProductTerm(term: string): GateNode {
  if (term.includes('⊕')) {
    const parts = term.split('⊕').map(p => p.trim());
    return { type: 'XOR', inputs: parts.map(p => parseLiteral(p)) };
  }
  
  // Extract variables with optional NOT. e.g. A, B', C
  const literals = term.match(/[A-Za-z0-9]'/g) || [];
  const rawVars = term.replace(/[A-Za-z0-9]'/g, '').match(/[A-Za-z0-9]/g) || [];
  
  const allLiterals = [...literals, ...rawVars];
  
  // Actually a better regex: match a letter optionally followed by '
  const matches = term.match(/[A-Za-z0-9]'?/g) || [];
  
  if (matches.length > 1) {
    return {
      type: 'AND',
      inputs: matches.map(m => parseLiteral(m))
    };
  }
  
  if (matches.length === 1) {
    return parseLiteral(matches[0]);
  }
  
  return { type: 'INPUT', variable: '0', value: 0 };
}

function parseLiteral(literal: string): GateNode {
  if (literal.endsWith("'")) {
    return {
      type: 'NOT',
      input: { type: 'INPUT', variable: literal[0].toUpperCase(), value: 0 }
    };
  }
  return { type: 'INPUT', variable: literal.toUpperCase(), value: 0 };
}

let idCounter = 0;
function genId() { return `node_${idCounter++}`; }

export function layoutCircuit(tree: GateNode): CircuitLayout {
  idCounter = 0;
  
  const nodes: LayoutNode[] = [];
  const wires: CircuitLayout['wires'] = [];
  
  // We do a simple level-based layout
  // Compute depth
  const depths = new Map<string, number>();
  
  function assignDepth(node: GateNode): { id: string, depth: number } {
    const id = genId();
    if (node.type === 'INPUT') {
      depths.set(id, 0);
      return { id, depth: 0 };
    }
    
    let maxChildDepth = 0;
    const childIds: string[] = [];
    
    const inputs = node.type === 'NOT' ? [node.input] : (node as any).inputs as GateNode[];
    for (const child of inputs) {
      const { id: childId, depth: cDepth } = assignDepth(child);
      maxChildDepth = Math.max(maxChildDepth, cDepth);
      childIds.push(childId);
    }
    
    const myDepth = maxChildDepth + 1;
    depths.set(id, myDepth);
    
    // Create LayoutNode
    let inPorts = [];
    if (node.type === 'NOT') inPorts = [{ x: 0, y: 20 }];
    else {
      if (inputs.length === 2) inPorts = [{ x: 0, y: 13 }, { x: 0, y: 27 }];
      else if (inputs.length === 3) inPorts = [{ x: 0, y: 10 }, { x: 0, y: 20 }, { x: 0, y: 30 }];
      else inPorts = inputs.map((_, i) => ({ x: 0, y: 10 + (30/(inputs.length-1 || 1))*i }));
    }
    
    nodes.push({
      id,
      gateNode: node,
      x: 0,
      y: 0,
      width: 50,
      height: 40,
      inputPorts: inPorts,
      outputPort: { x: 50, y: 20 }
    });
    
    // Create wires from children to me
    childIds.forEach((cId, i) => {
      wires.push({
        fromId: cId,
        fromPort: 0, // children output port
        toId: id,
        toPort: i
      });
    });
    
    return { id, depth: myDepth };
  }
  
  const { id: rootId, depth: rootDepth } = assignDepth(tree);
  
  // Layout X positions based on depth
  const levelWidth = 120;
  const numLevels = rootDepth + 1;
  const width = numLevels * levelWidth + 100;
  
  // Group nodes by depth
  const nodesByDepth: Record<number, string[]> = {};
  for (let i = 0; i <= rootDepth; i++) nodesByDepth[i] = [];
  
  nodes.forEach(n => {
    const d = depths.get(n.id) || 0;
    nodesByDepth[d].push(n.id);
  });
  
  const inputPins: CircuitLayout['inputPins'] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // Position nodes
  let height = 100;
  for (let d = 1; d <= rootDepth; d++) {
    const dNodes = nodesByDepth[d];
    const levelHeight = dNodes.length * 80;
    height = Math.max(height, levelHeight + 100);
    
    dNodes.forEach((id, idx) => {
      const node = nodeMap.get(id)!;
      node.x = 100 + (d - 1) * levelWidth;
      node.y = 50 + idx * 80;
    });
  }
  
  // Position inputs
  const rawInputs = Array.from(depths.entries()).filter(([id, d]) => d === 0);
  const distinctVars = Array.from(new Set(rawInputs.map(([id]) => {
    // Find the gate tree input node somewhere... actually they aren't in `nodes` because we skipped them!
    // Wait, assignDepth skipped adding INPUT nodes to `nodes` array!
    return 'A'; // Hack
  })));
  // Let's fix input positioning by reconstructing input variables
  
  const usedVars = new Map<string, number>();
  let varIdx = 0;
  
  // We need to properly link wires from inputs. Since we didn't create LayoutNodes for INPUTs, 
  // we treat them as inputPins.
  rawInputs.forEach(([id, d], idx) => {
    // We need to find which GateNode this is.
    // We didn't save the GateNode for INPUTs. Let's fix assignDepth.
  });
  
  // Clean rewrite of layoutCircuit for real
  return generateLayoutClean(tree);
}


function generateLayoutClean(tree: GateNode): CircuitLayout {
  idCounter = 0;
  const nodes: LayoutNode[] = [];
  const wires: CircuitLayout['wires'] = [];
  const inputs: { variable: string; id: string }[] = [];
  
  function traverse(node: GateNode): string {
    const id = genId();
    
    if (node.type === 'INPUT') {
      inputs.push({ variable: node.variable, id });
      return id;
    }
    
    const children = node.type === 'NOT' ? [node.input] : (node as any).inputs as GateNode[];
    const childIds = children.map(c => traverse(c));
    
    let inPorts = [];
    if (node.type === 'NOT') inPorts = [{ x: 0, y: 20 }];
    else if (children.length === 2) inPorts = [{ x: 0, y: 13 }, { x: 0, y: 27 }];
    else if (children.length === 3) inPorts = [{ x: 0, y: 10 }, { x: 0, y: 20 }, { x: 0, y: 30 }];
    else inPorts = children.map((_, i) => ({ x: 0, y: 10 + (30/(children.length-1 || 1))*i }));
    
    nodes.push({
      id,
      gateNode: node,
      x: 0, y: 0, width: 50, height: 40,
      inputPorts: inPorts,
      outputPort: { x: 50, y: 20 }
    });
    
    childIds.forEach((cId, i) => {
      wires.push({
        fromId: cId,
        fromPort: 0,
        toId: id,
        toPort: i
      });
    });
    
    return id;
  }
  
  const rootId = traverse(tree);
  
  // Now we have nodes and wires. We need to assign positions.
  // topological sort from output to inputs
  const levels = new Map<string, number>();
  levels.set(rootId, 0);
  
  let queue = [rootId];
  let maxLevel = 0;
  
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currLevel = levels.get(curr)!;
    
    wires.filter(w => w.toId === curr).forEach(w => {
      levels.set(w.fromId, currLevel + 1);
      maxLevel = Math.max(maxLevel, currLevel + 1);
      queue.push(w.fromId);
    });
  }
  
  // Position logic
  const levelWidth = 140;
  const width = (maxLevel + 2) * levelWidth;
  
  let height = 0;
  const inputPins: CircuitLayout['inputPins'] = [];
  
  // Group by level
  for (let l = 0; l <= maxLevel; l++) {
    const lNodes = nodes.filter(n => levels.get(n.id) === l);
    const lInputs = inputs.filter(i => levels.get(i.id) === l);
    
    const count = lNodes.length + lInputs.length;
    height = Math.max(height, count * 80 + 100);
    
    let yOffset = 50;
    
    lNodes.forEach(n => {
      n.x = width - (l + 1) * levelWidth;
      n.y = yOffset;
      yOffset += 80;
    });
    
    lInputs.forEach(inp => {
      inputPins.push({
        id: inp.id,
        variable: inp.variable,
        x: width - (l + 1) * levelWidth - 30, // input pins slightly left
        y: yOffset + 20
      });
      yOffset += 80;
    });
  }
  
  // Adjust output
  const outNode = nodes.find(n => n.id === rootId);
  const outputPin = {
    x: width - 50,
    y: outNode ? outNode.y + 20 : 100,
    id: 'out'
  };
  if (outNode) {
    wires.push({
      fromId: rootId,
      fromPort: 0,
      toId: 'out',
      toPort: 0
    });
  } else if (inputs.length === 1 && inputs[0].id === rootId) {
    // Output directly connected to input
    outputPin.y = inputPins[0].y;
    wires.push({
      fromId: rootId,
      fromPort: 0,
      toId: 'out',
      toPort: 0
    });
  }
  
  return {
    nodes,
    wires,
    width,
    height: Math.max(height, 300),
    inputPins,
    outputPin
  };
}

export function evaluateGateTree(tree: GateNode, inputs: Record<string, number>): number {
  if (tree.type === 'INPUT') return inputs[tree.variable] || 0;
  if (tree.type === 'NOT') return evaluateGateTree(tree.input, inputs) ? 0 : 1;
  
  const vals = (tree as any).inputs.map((c: GateNode) => evaluateGateTree(c, inputs));
  if (tree.type === 'AND') return vals.every((v: number) => v === 1) ? 1 : 0;
  if (tree.type === 'OR') return vals.some((v: number) => v === 1) ? 1 : 0;
  if (tree.type === 'NAND') return vals.every((v: number) => v === 1) ? 0 : 1;
  if (tree.type === 'NOR') return vals.some((v: number) => v === 1) ? 0 : 1;
  if (tree.type === 'XOR') return vals.reduce((a: number,b: number) => a ^ b, 0);
  if (tree.type === 'XNOR') return vals.reduce((a: number,b: number) => a ^ b, 0) ? 0 : 1;
  
  return 0;
}

export function annotateLayout(layout: CircuitLayout, inputs: Record<string, number>): CircuitLayout {
  // Simple traversal to evaluate wire values
  const vals = new Map<string, number>();
  
  layout.inputPins.forEach(p => {
    vals.set(p.id, inputs[p.variable] || 0);
  });
  
  // evaluate nodes
  // Need to evaluate in correct order (bottom-up from inputs)
  let changed = true;
  while(changed) {
    changed = false;
    layout.nodes.forEach(n => {
      if (!vals.has(n.id)) {
        // can we evaluate it?
        const inWires = layout.wires.filter(w => w.toId === n.id);
        const allInsReady = inWires.every(w => vals.has(w.fromId));
        if (allInsReady) {
          // get input values in order
          inWires.sort((a,b) => a.toPort - b.toPort);
          const inVals = inWires.map(w => vals.get(w.fromId)!);
          
          let res = 0;
          if (n.gateNode.type === 'NOT') res = inVals[0] ? 0 : 1;
          else if (n.gateNode.type === 'AND') res = inVals.every(v => v===1) ? 1 : 0;
          else if (n.gateNode.type === 'OR') res = inVals.some(v => v===1) ? 1 : 0;
          else if (n.gateNode.type === 'NAND') res = inVals.every(v => v===1) ? 0 : 1;
          else if (n.gateNode.type === 'NOR') res = inVals.some(v => v===1) ? 0 : 1;
          else if (n.gateNode.type === 'XOR') res = inVals.reduce((a,b)=>a^b,0);
          else if (n.gateNode.type === 'XNOR') res = inVals.reduce((a,b)=>a^b,0) ? 0 : 1;
          
          vals.set(n.id, res);
          changed = true;
        }
      }
    });
  }
  
  const newWires = layout.wires.map(w => ({
    ...w,
    value: vals.get(w.fromId) || 0
  }));
  
  return { ...layout, wires: newWires };
}
