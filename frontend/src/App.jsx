import { useState } from "react";
import "./App.css";

export default function App() {
  const [input, setInput] = useState("");
  const API_URL = import.meta.env.VITE_API_URL;
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parseInput = (raw) => {
  if (!raw) return [];

  return raw
    .split(/[\n,]+/)
    .map(item => item.trim().replace(/^["']|["']$/g, ""))
    .filter(item => item.length > 0);
};

  const submitData = async () => {
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const data = parseInput(input);

      const res = await fetch(`${API_URL}/bfhl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "API Error");

      setResult(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">


      <header>
        <div className="header-tag">Bajaj API FULLSTACK PROJECT</div>
        <h1>
          Hierarchy <br />
          <em>Engine</em>
        </h1>
        <p className="header-sub">
          Parse node edge lists into structured tree hierarchies.
        </p>
      </header>


      <div className="input-section">

        <div className="input-header">
          <span className="input-label">node edges[ ]</span>
        </div>

  
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='"A->B", "A->C", "B->D"'
        />


        <div className="input-footer">
          <button
            className="btn-submit"
            onClick={submitData}
            disabled={loading}
          >
            {loading ? "Loading..." : "Run →"}
          </button>
        </div>

      </div>


      {error && (
        <div className="error-box show">
          <div className="error-title"> ERROR</div>
          <div className="error-msg">{error}</div>
        </div>
      )}

      {result && (
  <div id="results" className="show">
    <div className="summary-grid">
      <div className="summary-card">
        <div className="sc-label">total trees</div>
        <div className="sc-value">{result.summary.total_trees}</div>
      </div>

      <div className="summary-card">
        <div className="sc-label">total cycles</div>
        <div className="sc-value">{result.summary.total_cycles}</div>
      </div>

      <div className="summary-card">
        <div className="sc-label">largest tree</div>
        <div className="sc-value">{result.summary.largest_tree_root}</div>
      </div>
    </div>


    <div className="section-header">
      <span className="section-title">hierarchies</span>
      <span className="section-count">{result.hierarchies.length}</span>
    </div>

    <div className="hierarchy-grid">
      {result.hierarchies.map((h, i) => (
        <div key={i} className="hierarchy-card">

          <div className="hcard-header">
            <div className="hcard-root">
              <div className={`root-badge ${h.has_cycle ? "cycle" : ""}`}>
                {h.root}
              </div>
              <span className="root-label">root</span>
            </div>

            <div className="hcard-meta">
              {h.depth && (
                <span className="meta-badge meta-depth">
                  depth: {h.depth}
                </span>
              )}
              {h.has_cycle && (
                <span className="meta-badge meta-cycle">cycle</span>
              )}
            </div>
          </div>

          <div className="hcard-body">
            {h.has_cycle ? (
              <div className="cycle-note">
                cycle detected -- no tree
              </div>
            ) : (
              <pre className="tree-display">
                {JSON.stringify(h.tree, null, 2)}
              </pre>
            )}
          </div>

        </div>
      ))}
    </div>


    <div className="tags-section">

      <div className="tags-card">
        <div className="tags-label">invalid entries</div>
        <div className="tag-list">
          {result.invalid_entries.length === 0
            ? <span className="tag-empty">none</span>
            : result.invalid_entries.map((i, idx) => (
                <span key={idx} className="tag tag-invalid">{i}</span>
              ))
          }
        </div>
      </div>

      <div className="tags-card">
        <div className="tags-label">duplicate edges</div>
        <div className="tag-list">
          {result.duplicate_edges.length === 0
            ? <span className="tag-empty">none</span>
            : result.duplicate_edges.map((i, idx) => (
                <span key={idx} className="tag tag-dup">{i}</span>
              ))
          }
        </div>
      </div>

    </div>

  </div>
)}

    </div>
  );
}