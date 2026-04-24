
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
require("dotenv").config();

const USER_ID = process.env.USER_ID;
const EMAIL_ID = process.env.EMAIL_ID;
const ROLL_NUMBER = process.env.ROLL_NUMBER;        


const VALID_EDGE = /^[A-Z]->[A-Z]$/;

function classifyEntries(data) {
  const valid = [];
  const invalid = [];
  const seen = new Set();
  const duplicates = [];

  for (const raw of data) {
    const entry = typeof raw === 'string' ? raw.trim() : String(raw).trim();

    if (!VALID_EDGE.test(entry)) {
      invalid.push(entry);
      continue;
    }


    if (entry[0] === entry[3]) {
      invalid.push(entry);
      continue;
    }

    if (seen.has(entry)) {
      if (!duplicates.includes(entry)) duplicates.push(entry);
    } else {
      seen.add(entry);
      valid.push(entry);
    }
  }

  return { valid, invalid_entries: invalid, duplicate_edges: duplicates };
}


function buildAdjacency(edges) {

  const childParent = {};
  const adj = {};       
  const allNodes = new Set();

  for (const edge of edges) {
    const [p, c] = edge.split('->');
    allNodes.add(p);
    allNodes.add(c);

    if (childParent[c] !== undefined) continue; 
    childParent[c] = p;

    if (!adj[p]) adj[p] = [];
    adj[p].push(c);
  }

  return { adj, childParent, allNodes };
}

function findConnectedComponents(allNodes, adj, childParent) {
  const visited = new Set();
  const components = [];


  const undirected = {};
  for (const n of allNodes) undirected[n] = new Set();
  for (const [p, children] of Object.entries(adj)) {
    for (const c of children) {
      undirected[p].add(c);
      undirected[c].add(p);
    }
  }

  for (const node of [...allNodes].sort()) {
    if (visited.has(node)) continue;
    const component = [];
    const queue = [node];
    while (queue.length) {
      const cur = queue.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);
      component.push(cur);
      for (const nb of (undirected[cur] || [])) {
        if (!visited.has(nb)) queue.push(nb);
      }
    }
    components.push(component);
  }

  return components;
}

function hasCycleInComponent(nodes, adj) {
  const visited = new Set();
  const recStack = new Set();

  function dfs(node) {
    visited.add(node);
    recStack.add(node);
    for (const child of (adj[node] || [])) {
      if (!visited.has(child)) {
        if (dfs(child)) return true;
      } else if (recStack.has(child)) {
        return true;
      }
    }
    recStack.delete(node);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node) && dfs(node)) return true;
  }
  return false;
}

function buildTree(root, adj) {
  const tree = {};
  function dfs(node, obj) {
    obj[node] = {};
    for (const child of (adj[node] || [])) {
      dfs(child, obj[node]);
    }
  }
  dfs(root, tree);
  return tree;
}

function calcDepth(root, adj) {
  function dfs(node) {
    const children = adj[node] || [];
    if (!children.length) return 1;
    return 1 + Math.max(...children.map(dfs));
  }
  return dfs(root);
}


function processGraph(data) {
  const { valid, invalid_entries, duplicate_edges } = classifyEntries(data);
  const { adj, childParent, allNodes } = buildAdjacency(valid);

  const components = findConnectedComponents(allNodes, adj, childParent);
  const hierarchies = [];

  for (const component of components) {
    const cyclic = hasCycleInComponent(component, adj);


    const roots = component.filter(n => childParent[n] === undefined);
    let root;
    if (roots.length > 0) {
      root = roots.sort()[0];
    } else {

      root = component.slice().sort()[0];
    }

    if (cyclic) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const tree = buildTree(root, adj);
      const depth = calcDepth(root, adj);
      hierarchies.push({ root, tree, depth });
    }
  }

  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclic = hierarchies.filter(h => h.has_cycle);

  let largest_tree_root = '';
  if (nonCyclic.length > 0) {
    const sorted = [...nonCyclic].sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.root.localeCompare(b.root);
    });
    largest_tree_root = sorted[0].root;
  }

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: ROLL_NUMBER,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees: nonCyclic.length,
      total_cycles: cyclic.length,
      largest_tree_root,
    },
  };
}

app.post('/bfhl', (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: '`data` must be an array of strings.' });
  }
  try {
    const result = processGraph(data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

app.get('/', (req, res) => res.json({ status: 'ok', message: 'BFHL API is running. POST /bfhl' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`BFHL API running on port ${PORT}`));