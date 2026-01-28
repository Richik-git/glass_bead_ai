import { useState, useEffect } from "react";
import cytoscape from "cytoscape";

const DOMAIN_COLORS = {
  Mathematics: "#2563eb", // blue
  Music: "#7c3aed",       // purple
  History: "#ea580c",     // orange
  Philosophy: "#059669",  // green
  Sociology: "#db2777",   // pink
  Default: "#374151",     // gray
};

const getDomainColor = (domain) => {
  if (!domain) return DOMAIN_COLORS.Default;
  return DOMAIN_COLORS[domain] || DOMAIN_COLORS.Default;
};


function App() {
  const [topic, setTopic] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const exploreTopic = async () => {
    if (!topic) return;

    setLoading(true);
    setData(null);
    setSelectedNode(null);

    const response = await fetch("http://127.0.0.1:8000/explore", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic }),
    });

    const result = await response.json();

    setData(result);
    setSelectedNode(result.nodes[0]); // default selection
    setLoading(false);
  };

  useEffect(() => {
    if (!data) return;

    const cy = cytoscape({
      container: document.getElementById("graph"),
      elements: [
        // Nodes
        ...data.nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.label,
            domain: node.domain,
          },
        })),

        // Edges
        ...data.edges.map((edge) => ({
          data: {
            source: edge.source,
            target: edge.target,
            label: edge.type,
          },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            "background-color": "#6366f1",
            color: "#ffffff",
            "font-size": "12px",
            width: "label",
            padding: "10px",
            "text-wrap": "wrap",
            "text-max-width": "80px",
            shape: "round-rectangle",
          },
        },
        {
          selector: "edge",
          style: {
            label: "data(label)",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "line-color": "#9ca3af",
            "target-arrow-color": "#9ca3af",
            "font-size": "10px",
            "text-background-color": "#ffffff",
            "text-background-opacity": 1,
            "text-background-padding": "3px",
          },
        },
      ],
      layout: {
        name: "breadthfirst",
        directed: true,
        padding: 20,
      },
    });

    cy.on("tap", "node", (event) => {
      setSelectedNode(event.target.data());
    });

    return () => cy.destroy();
  }, [data]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Glass Bead AI</h1>
      <p style={styles.subtitle}>
        Explore hidden connections between ideas
      </p>

      <div style={styles.inputRow}>
        <input
          type="text"
          placeholder="Enter a topic (e.g. Fourier Transform)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={styles.input}
        />
        <button onClick={exploreTopic} style={styles.button}>
          Explore
        </button>
      </div>

      {loading && <p>Thinking...</p>}

      {data && selectedNode && (
        <div style={styles.card}>
          <h2
            style={{
              color: getDomainColor(selectedNode.domain),
            }}
          >
            {selectedNode.label}
          </h2>
          <p>
            <span
              style={{
                ...styles.badge,
                backgroundColor: getDomainColor(selectedNode.domain) + "20",
                color: getDomainColor(selectedNode.domain),
              }}
            >
              {selectedNode.domain}
            </span>
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <span style={{ ...styles.badge, ...styles.typeBadge }}>
              {data.edges[0].type}
            </span>

            <span style={{ ...styles.badge, ...styles.confidenceBadge }}>
              Confidence: {Math.round(data.edges[0].confidence * 100)}%
            </span>
          </div>

          <p>
            <strong>Explanation</strong><br />
            {data.edges[0].explanation}
          </p>
        </div>
      )}

      {data && (
        <div
          id="graph"
          style={{
            width: "100%",
            maxWidth: "100%",
            height: "260px",
            marginTop: "2rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            background: "#fafafa",
          }}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    fontFamily: "Inter, Arial, sans-serif",
    maxWidth: "900px",
    margin: "0 auto",
    width: "100%",
  },
  title: {
    marginBottom: "0.2rem",
  },
  subtitle: {
    color: "#555",
    marginBottom: "1.5rem",
  },
  inputRow: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "2rem",
  },
  input: {
    flex: 1,
    padding: "0.6rem",
    fontSize: "1rem",
  },
  button: {
    padding: "0.6rem 1rem",
    fontSize: "1rem",
    cursor: "pointer",
  },
  card: {
    background: "#f9f9f9",
    padding: "1.5rem",
    borderRadius: "8px",
    lineHeight: "1.6",
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    marginRight: "8px",
  },

  typeBadge: {
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
  },

  confidenceBadge: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
};

export default App;
