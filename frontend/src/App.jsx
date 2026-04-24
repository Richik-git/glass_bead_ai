import { useState, useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Bookmark, Trash2, ArrowRight, Zap, Layers, BookOpen } from "lucide-react";

const DOMAIN_COLORS = {
  "Core Concept": "#3b82f6",
  Mathematics: "#6366f1",
  Music: "#ec4899",
  History: "#f97316",
  Philosophy: "#10b981",
  Physics: "#f43f5e",
  Default: "#94a3b8",
};

function App() {
  const [topic, setTopic] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const cyRef = useRef(null);

  const [library, setLibrary] = useState(() => {
    const saved = localStorage.getItem("glass_bead_library");
    return saved ? JSON.parse(saved) : [];
  });

  // --- 🔥 FIX 1: SAVE FULL GRAPH DATA TO LIBRARY ---
  const saveToLibrary = () => {
    if (!data || !topic) return;
    if (library.some(item => item.topic === topic)) return;

    const newItem = { 
      id: Date.now(), 
      topic: topic, 
      content: data.story, 
      domain: data.nodes[0]?.domain || "Core Concept",
      // We must save these so the graph can be rebuilt later!
      nodes: data.nodes,
      edges: data.edges 
    };

    const updated = [newItem, ...library];
    setLibrary(updated);
    localStorage.setItem("glass_bead_library", JSON.stringify(updated));
  };

  const removeFromLibrary = (id) => {
    const updated = library.filter(item => item.id !== id);
    setLibrary(updated);
    localStorage.setItem("glass_bead_library", JSON.stringify(updated));
  };

  // --- 🔥 FIX 2: HANDLER TO OPEN VAULT ITEMS PROPERLY ---
  const handleVaultClick = (item) => {
    setTopic(item.topic);
    // Setting data here triggers the useEffect graph builder automatically
    setData({
      story: item.content,
      nodes: item.nodes,
      edges: item.edges
    });
    setSelectedElement({ 
      id: 'main', 
      label: item.topic, 
      domain: item.domain, 
      content: item.content 
    });
  };

  const exploreTopic = async (targetTopic = topic, context = null) => {
    const searchTopic = targetTopic || topic;
    if (!searchTopic) return;
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: searchTopic, context: context }),
      });
      const result = await response.json();
      setData(result);
      setTopic(searchTopic);
      setSelectedElement({ 
        id: 'main', label: result.nodes[0].label, domain: "Core Concept", content: result.story 
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    const container = document.getElementById("graph");
    if (!data || !container) return;
    if (cyRef.current) cyRef.current.destroy();

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
            "text-halign": "center",
            color: "#ffffff",
            "text-wrap": "wrap",
            "text-max-width": "80px",
            "line-height": 1.2,
            "font-size": "11px",
            "font-weight": "800",
            "text-outline-width": 3,
            "text-outline-color": (ele) => DOMAIN_COLORS[ele.data("domain")] || DOMAIN_COLORS.Default,
            "background-color": (ele) => DOMAIN_COLORS[ele.data("domain")] || DOMAIN_COLORS.Default,
            width: (ele) => ele.data("id") === "main" ? "110px" : "90px",
            height: (ele) => ele.data("id") === "main" ? "110px" : "90px",
            "border-width": 4,
            "border-color": "#ffffff",
            "border-opacity": 0.9,
            "shadow-blur": 12,
            "shadow-color": "rgba(0,0,0,0.3)",
          },
        },
        {
          selector: "edge",
          style: {
            width: 4,
            "line-color": "#475569",
            "target-arrow-color": "#475569",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(type)",
            "text-wrap": "wrap",
            "text-max-width": "60px",
            "font-size": "10px",
            "font-weight": "700",
            "color": "#1e293b",
            "text-background-opacity": 1,
            "text-background-color": "#f1f5f9",
            "text-background-padding": "4px",
            "text-background-shape": "roundrectangle",
            "text-rotation": "autorotate",
          },
        },
      ],
      layout: { 
        name: "cose", 
        padding: 100, 
        animate: true,
        nodeRepulsion: 8000, 
        idealEdgeLength: 150,
      },
    });

    cy.on("tap", "node", (evt) => {
      const node = evt.target.data();
      setSelectedElement({ 
        id: node.id, label: node.label, domain: node.domain, content: node.id === 'main' ? data.story : node.explanation 
      });
    });

    cyRef.current = cy;
    return () => { if (cyRef.current) cyRef.current.destroy(); };
  }, [data]);

  return (
    <div style={styles.page}>
      <div style={styles.blob1}></div>
      <div style={styles.blob2}></div>

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.brand}>
            <Layers size={32} color="#3b82f6" />
            <h1 style={styles.title}>Glass Bead <span style={{color: '#3b82f6'}}>AI</span></h1>
          </div>
          <p style={styles.subtitle}>Transforming complexity into intuition</p>
        </header>

        <div style={styles.inputRow}>
          <div style={styles.searchWrapper}>
            <input
              style={styles.input}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Search a concept (e.g. Entropy)..."
              onKeyDown={(e) => e.key === 'Enter' && exploreTopic()}
            />
            <button style={styles.button} onClick={() => exploreTopic()} disabled={loading}>
              {loading ? "..." : <ArrowRight size={20} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!loading && data && (
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} style={styles.contentLayout}>
              <div style={styles.cardSection}>
                {selectedElement && (
                  <div style={styles.storyCard}>
                    <div style={styles.cardTop}>
                      <span style={{...styles.badge, color: DOMAIN_COLORS[selectedElement.domain] || '#64748b'}}>
                        {selectedElement.domain}
                      </span>
                      <button onClick={saveToLibrary} style={styles.saveBtn}>
                        <Bookmark size={20} fill={library.some(i => i.topic === topic) ? "#3b82f6" : "none"} />
                      </button>
                    </div>
                    <h2 style={styles.cardTitle}>{selectedElement.label}</h2>
                    <p style={styles.storyText}>{selectedElement.content}</p>
                    {selectedElement.id !== 'main' && (
                      <button style={styles.expandButton} onClick={() => exploreTopic(selectedElement.label, data.nodes[0].label)}>
                        Dive Deeper <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={styles.graphSection}>
                <div id="graph" style={styles.graphCanvas} />
                <div style={styles.graphHint}><Zap size={14} /> Tap nodes to reveal their hidden logic</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && <div style={styles.loader}><Sparkles className="animate-spin" /> Synthesizing Knowledge...</div>}

        {!loading && library.length > 0 && (
          <div style={styles.libraryContainer}>
            <div style={styles.libHeader}><BookOpen size={20} /> Your Intuition Vault</div>
            <div style={styles.libraryGrid}>
              {library.map((item) => (
                <motion.div 
                  whileHover={{y: -5}} 
                  key={item.id} 
                  style={styles.miniCard}
                  onClick={() => handleVaultClick(item)} // 🔥 FIX: USE HANDLER
                >
                  <div style={styles.miniCardHeader}>
                    <small>{item.domain}</small>
                    <Trash2 
                      size={14} 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent loading when deleting
                        removeFromLibrary(item.id);
                      }} 
                      style={{cursor:'pointer'}}
                    />
                  </div>
                  <h3>{item.topic}</h3>
                  <button style={styles.viewBtn}>Revisit Metaphor</button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#f8fafc", minHeight: "100vh", position: "relative", overflowX: "hidden", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  blob1: { position: "absolute", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)", top: "-200px", left: "-100px", zIndex: 0 },
  blob2: { position: "absolute", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)", bottom: "-100px", right: "-100px", zIndex: 0 },
  container: { padding: "3rem 2rem", maxWidth: "1300px", margin: "0 auto", position: "relative", zIndex: 1 },
  header: { textAlign: "center", marginBottom: "3rem" },
  brand: { display: "flex", alignItems: "center", justifyContent: "center", gap: "15px", marginBottom: "0.5rem" },
  title: { fontSize: "3.5rem", fontWeight: "800", letterSpacing: "-2px", color: "#0f172a", margin: 0 },
  subtitle: { color: "#64748b", fontSize: "1.1rem" },
  searchWrapper: { display: "flex", background: "#fff", padding: "8px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", width: "500px" },
  inputRow: { display: "flex", justifyContent: "center", marginBottom: "4rem" },
  input: { flex: 1, border: "none", outline: "none", padding: "0 15px", fontSize: "1rem" },
  button: { background: "#0f172a", color: "#fff", border: "none", padding: "12px", borderRadius: "15px", cursor: "pointer" },
  contentLayout: { display: "grid", gridTemplateColumns: "420px 1fr", gap: "2.5rem" },
  storyCard: { background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", padding: "2.5rem", borderRadius: "30px", border: "1px solid #fff", boxShadow: "0 20px 50px rgba(0,0,0,0.05)" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  badge: { fontSize: "0.7rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.1em" },
  cardTitle: { fontSize: "2.2rem", fontWeight: "800", color: "#0f172a", margin: "1rem 0" },
  storyText: { lineHeight: "1.8", color: "#475569", fontSize: "1.1rem" },
  saveBtn: { background: "none", border: "none", cursor: "pointer", color: "#3b82f6" },
  expandButton: { marginTop: "2rem", width: "100%", padding: "12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  graphCanvas: { height: "600px", background: "rgba(255,255,255,0.5)", backdropFilter: "blur(5px)", borderRadius: "30px", border: "1px solid #fff", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" },
  graphHint: { textAlign: "center", marginTop: "1rem", color: "#94a3b8", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
  libraryContainer: { marginTop: "6rem", background: "rgba(255,255,255,0.4)", padding: "3rem", borderRadius: "40px", border: "1px solid #e2e8f0" },
  libHeader: { fontSize: "1.5rem", fontWeight: "800", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "12px" },
  libraryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" },
  miniCard: { background: "#fff", padding: "1.5rem", borderRadius: "20px", boxShadow: "0 4px 10px rgba(0,0,0,0.03)", cursor: "pointer" },
  miniCardHeader: { display: "flex", justifyContent: "space-between", color: "#94a3b8", marginBottom: "1rem" },
  viewBtn: { background: "none", border: "none", color: "#3b82f6", fontWeight: "700", cursor: "pointer", padding: 0, marginTop: "1rem" },
  loader: { textAlign: "center", padding: "5rem", fontSize: "1.2rem", color: "#3b82f6", fontWeight: "600" }
};

export default App;