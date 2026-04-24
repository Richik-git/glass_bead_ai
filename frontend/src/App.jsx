import { useState, useEffect, useRef } from "react";
import cytoscape from "cytoscape";

const DOMAIN_COLORS = {
  "Core Concept": "#111827",
  Mathematics: "#2563eb",
  Music: "#7c3aed",
  History: "#ea580c",
  Philosophy: "#059669",
  Physics: "#be185d",
  Art: "#db2777",
  Default: "#64748b",
};

function App() {
  const [topic, setTopic] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const cyRef = useRef(null);

  // Updated to handle context (the 'parent' topic)
  const exploreTopic = async (targetTopic = topic, context = null) => {
    const searchTopic = targetTopic || topic;
    if (!searchTopic) return;
    
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: searchTopic,
          context: context // Sending context to backend
        }),
      });
      const result = await response.json();
      
      if (result.error) {
        alert("AI Error: " + result.error);
      } else {
        setData(result);
        setTopic(searchTopic); // Sync input field with new topic
        setSelectedElement({ 
          type: 'node', 
          id: 'main',
          label: result.nodes[0].label,
          domain: "Core Concept",
          content: result.story 
        });
      }
    } catch (err) {
      console.error("Network Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const container = document.getElementById("graph");
    if (!data || !container) return;

    if (cyRef.current) cyRef.current.destroy();

    try {
      const cy = cytoscape({
        container: container,
        elements: {
          nodes: data.nodes.map((n) => ({ data: { ...n } })),
          edges: data.edges.map((e) => ({ data: { ...e } })),
        },
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "text-valign": "center",
              "background-color": (ele) => DOMAIN_COLORS[ele.data("domain")] || DOMAIN_COLORS.Default,
              color: "#fff",
              "font-size": "10px",
              width: "70px",
              height: "70px",
              "text-wrap": "wrap",
              "text-max-width": "60px",
              "transition-property": "width, height",
              "transition-duration": "0.3s"
            },
          },
          {
            selector: "node:selected",
            style: {
                "border-width": "4px",
                "border-color": "#000",
                width: "80px",
                height: "80px"
            }
          },
          {
            selector: "edge",
            style: {
              width: 2,
              label: "data(type)",
              "font-size": "8px",
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "line-color": "#cbd5e1",
              "target-arrow-color": "#cbd5e1",
              "text-background-opacity": 1,
              "text-background-color": "#ffffff",
            },
          },
        ],
        layout: { name: "cose", padding: 40, animate: true },
      });

      cy.on("tap", "node", (evt) => {
        const node = evt.target.data();
        setSelectedElement({ 
          type: 'node', 
          id: node.id,
          label: node.label, 
          domain: node.domain, 
          content: node.id === 'main' ? data.story : node.explanation 
        });
      });

      cyRef.current = cy;
    } catch (e) { console.error(e); }

    return () => { if (cyRef.current) cyRef.current.destroy(); };
  }, [data]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>💎 Glass Bead AI</h1>
        <p style={styles.subtitle}>Click any connection to dive deeper into the metaphor web</p>
      </header>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (e.g. Entropy)..."
          onKeyDown={(e) => e.key === 'Enter' && exploreTopic()}
        />
        <button style={styles.button} onClick={() => exploreTopic()} disabled={loading}>
          {loading ? "Synthesizing..." : "Explore"}
        </button>
      </div>

      {!loading && data && (
        <div style={styles.contentLayout}>
          <div style={styles.cardSection}>
            {selectedElement && (
              <div style={styles.storyCard}>
                <span style={{
                  ...styles.badge, 
                  backgroundColor: (DOMAIN_COLORS[selectedElement.domain] || '#000') + '20', 
                  color: DOMAIN_COLORS[selectedElement.domain]
                }}>
                  {selectedElement.domain}
                </span>
                <h2 style={styles.cardTitle}>{selectedElement.label}</h2>
                <p style={styles.storyText}>{selectedElement.content}</p>
                
                {/* 🔥 NEW: THE DEEP DIVE BUTTON */}
                {selectedElement.id !== 'main' && (
                    <button 
                        style={styles.expandButton}
                        onClick={() => exploreTopic(selectedElement.label, data.nodes[0].label)}
                    >
                        Explore {selectedElement.label} →
                    </button>
                )}
              </div>
            )}
          </div>

          <div style={styles.graphSection}>
            <div id="graph" style={styles.graphCanvas} />
            <p style={styles.graphHint}>The graph is interactive. Select a node to see its metaphor.</p>
          </div>
        </div>
      )}
      
      {loading && <div style={styles.loader}>✨ Connecting the beads of knowledge...</div>}
    </div>
  );
}

const styles = {
  container: { padding: "2rem", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif", color: "#1e293b" },
  header: { textAlign: "center", marginBottom: "2rem" },
  title: { fontSize: "2.8rem", margin: 0 },
  subtitle: { color: "#64748b", marginTop: "0.5rem" },
  inputRow: { display: "flex", gap: "1rem", marginBottom: "3rem", justifyContent: "center" },
  input: { padding: "0.8rem 1.2rem", width: "400px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "1rem" },
  button: { padding: "0.8rem 2rem", borderRadius: "12px", backgroundColor: "#0f172a", color: "white", cursor: "pointer", border: "none", fontWeight: "600" },
  contentLayout: { display: "grid", gridTemplateColumns: "400px 1fr", gap: "2rem", alignItems: "start" },
  cardSection: { position: "sticky", top: "2rem" },
  storyCard: { padding: "2rem", backgroundColor: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" },
  cardTitle: { marginTop: "1rem", fontSize: "1.8rem", color: "#0f172a" },
  storyText: { lineHeight: "1.8", color: "#334155", fontSize: "1.05rem" },
  expandButton: { marginTop: "1.5rem", width: "100%", padding: "0.8rem", borderRadius: "8px", backgroundColor: "#3b82f6", color: "white", border: "none", cursor: "pointer", fontWeight: "600", transition: "background 0.2s" },
  graphCanvas: { height: "550px", backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0" },
  badge: { padding: "4px 12px", borderRadius: "99px", fontSize: "0.7rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" },
  graphSection: { display: "flex", flexDirection: "column" },
  graphHint: { textAlign: "center", fontSize: "0.85rem", color: "#94a3b8", marginTop: "1rem" },
  loader: { textAlign: "center", padding: "100px", fontSize: "1.2rem", color: "#64748b" }
};

export default App;