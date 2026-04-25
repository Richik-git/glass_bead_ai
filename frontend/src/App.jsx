import { useState, useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Bookmark, Trash2, ArrowRight, Zap, Layers, BookOpen, Search, Cpu } from "lucide-react";

const DOMAIN_COLORS = {
  "Core Concept": "#60a5fa",
  Mathematics: "#818cf8",
  Music: "#f472b6",
  History: "#fb923c",
  Philosophy: "#34d399",
  Physics: "#fb7185",
  Default: "#94a3b8",
};

function App() {
  const [topic, setTopic] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  // 🔥 Tooltip state for edge magnification
  const [tooltip, setTooltip] = useState({ show: false, text: "", x: 0, y: 0 });
  const cyRef = useRef(null);

  const [library, setLibrary] = useState(() => {
    const saved = localStorage.getItem("glass_bead_library");
    return saved ? JSON.parse(saved) : [];
  });

  const saveToLibrary = () => {
    if (!data || !topic) return;
    if (library.some(item => item.topic === topic)) return;

    const newItem = { 
      id: Date.now(), 
      topic: topic, 
      content: data.story, 
      domain: data.nodes[0]?.domain || "Core Concept",
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

  const handleVaultClick = (item) => {
    setTopic(item.topic);
    setData({ story: item.content, nodes: item.nodes, edges: item.edges });
    setSelectedElement({ id: 'main', label: item.topic, domain: item.domain, content: item.content });
  };

  const exploreTopic = async (targetTopic = topic, context = null) => {
    const searchTopic = targetTopic || topic;
    if (!searchTopic) return;
    
    setLoading(true);
    setData(null); // Clear old data to prevent ghost rendering
    
    try {
      // 🚨 DOUBLE CHECK THIS URL: Must be HTTPS and end with /explore
      const response = await fetch("https://your-render-app-name.onrender.com/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: searchTopic, context: context }),
      });
      
      const result = await response.json();
      
      // Safety Check: Only set data if it has the structure we expect
      if (result && result.nodes && result.nodes.length > 0) {
        setData(result);
        setTopic(searchTopic);
        setSelectedElement({ 
          id: 'main', 
          label: result.nodes[0].label, 
          domain: "Core Concept", 
          content: result.story 
        });
      } else {
        console.error("Malformed data received:", result);
        alert("Received incomplete data from AI.");
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      alert("Backend connection failed. Check if Render is awake!");
    } finally {
      setLoading(false);
    }
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
            width: (ele) => ele.data("id") === "main" ? "105px" : "85px",
            height: (ele) => ele.data("id") === "main" ? "105px" : "85px",
            "border-width": 2,
            "border-color": "rgba(255,255,255,0.4)",
            "shadow-blur": 15,
            "shadow-color": (ele) => DOMAIN_COLORS[ele.data("domain")] || "#000",
            "shadow-opacity": 0.5,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "rgba(255,255,255,0.15)",
            "target-arrow-color": "rgba(255,255,255,0.15)",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(type)",
            "font-size": "9px",
            "font-weight": "700",
            "color": "#94a3b8",
            "text-background-opacity": 1,
            "text-background-color": "#0f172a", 
            "text-background-padding": "3px",
            "text-rotation": "autorotate",
          },
        },
      ],
      layout: { 
        name: "cose", 
        padding: 60, 
        nodeRepulsion: 10000, 
        idealEdgeLength: 150,
      },
    });

    // 🔥 EDGE HOVER MAGNIFICATION LOGIC
    cy.on("mouseover", "edge", (evt) => {
      const edge = evt.target;
      setTooltip({
        show: true,
        text: edge.data("type"),
        x: evt.renderedPosition.x,
        y: evt.renderedPosition.y
      });
    });

    cy.on("mousemove", "edge", (evt) => {
      setTooltip(prev => ({
        ...prev,
        x: evt.renderedPosition.x,
        y: evt.renderedPosition.y
      }));
    });

    cy.on("mouseout", "edge", () => {
      setTooltip({ show: false, text: "", x: 0, y: 0 });
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
      <style>{`
        .edge-tooltip {
          position: absolute;
          pointer-events: none;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          color: #fff;
          padding: 10px 18px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          transform: translate(-50%, -120%);
        }
      `}</style>

      <div style={styles.aurora1}></div>
      <div style={styles.aurora2}></div>

      <div style={styles.container}>
        <header style={styles.header}>
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={styles.brand}>
            <div style={styles.logoCircle}><Layers size={24} color="#fff" /></div>
            <h1 style={styles.title}>Glass Bead <span style={{ color: '#60a5fa', fontWeight: '400' }}>AI</span></h1>
          </motion.div>
          <p style={styles.subtitle}>Bridging technical concepts through structural metaphors</p>
        </header>

        <div style={styles.inputRow}>
          <div style={styles.searchWrapper}>
            <Search size={18} color="#475569" />
            <input
              style={styles.input}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Type a concept to synthesize..."
              onKeyDown={(e) => e.key === 'Enter' && exploreTopic()}
            />
            <button style={styles.button} onClick={() => exploreTopic()} disabled={loading}>
              {loading ? <Cpu className="animate-spin" size={18}/> : <ArrowRight size={18} />}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {(!loading && data?.nodes?.length > 0) ? (
            <motion.div 
              key={topic}
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              style={styles.contentLayout}
            >
              <div style={styles.cardSection}>
                {selectedElement && (
                  <div style={styles.storyCard}>
                    <div style={styles.cardTop}>
                      <span style={{ ...styles.badge, color: DOMAIN_COLORS[selectedElement.domain] || '#94a3b8', border: `1px solid ${DOMAIN_COLORS[selectedElement.domain] || '#94a3b8'}` }}>
                        {selectedElement.domain}
                      </span>
                      <button onClick={saveToLibrary} style={styles.saveBtn}>
                        <Bookmark size={20} fill={library.some(i => i.topic === topic) ? "#60a5fa" : "none"} color={library.some(i => i.topic === topic) ? "#60a5fa" : "#94a3b8"} />
                      </button>
                    </div>
                    <h2 style={styles.cardTitle}>{selectedElement.label}</h2>
                    <p style={styles.storyText}>{selectedElement.content}</p>
                    {selectedElement.id !== 'main' && (
                      <button style={styles.expandButton} onClick={() => exploreTopic(selectedElement.label, data.nodes[0].label)}>
                        Dive Deeper <Zap size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={styles.graphSection}>
                <div style={{ position: 'relative' }}>
                  <div id="graph" style={styles.graphCanvas} />
                  {tooltip.show && (
                    <div className="edge-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
                      <Zap size={14} color="#60a5fa" />
                      {tooltip.text}
                    </div>
                  )}
                </div>
                <div style={styles.graphHint}><Sparkles size={12} /> Hover edges to magnify connections</div>
              </div>
            </motion.div>
          ) : !loading && (
            <div style={styles.emptyState}>
                <Sparkles size={48} color="#1e293b" />
                <p>Knowledge beads are waiting to be connected...</p>
            </div>
          )}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.loader}>
            <p>Weaving knowledge beads...</p>
          </motion.div>
        )}

        {!loading && library.length > 0 && (
          <div style={styles.libraryContainer}>
            <div style={styles.libHeader}><BookOpen size={18} /> INTUITION VAULT</div>
            <div style={styles.libraryGrid}>
              {library.map((item) => (
                <motion.div 
                  whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }} 
                  key={item.id} 
                  style={styles.miniCard}
                  onClick={() => handleVaultClick(item)}
                >
                  <div style={styles.miniCardHeader}>
                    <small style={{ color: DOMAIN_COLORS[item.domain] }}>{item.domain}</small>
                    <Trash2 
                      size={14} 
                      onClick={(e) => { e.stopPropagation(); removeFromLibrary(item.id); }} 
                      style={{ cursor: 'pointer', color: '#475569' }}
                    />
                  </div>
                  <h3 style={styles.miniCardTitle}>{item.topic}</h3>
                  <div style={styles.revisit}>Open Metaphor →</div>
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
  page: { background: "#020617", minHeight: "100vh", position: "relative", overflowX: "hidden", fontFamily: "'Inter', sans-serif", color: "#f8fafc" },
  aurora1: { position: "absolute", width: "800px", height: "600px", background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)", top: "-100px", left: "-200px", zIndex: 0, filter: "blur(60px)" },
  aurora2: { position: "absolute", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)", bottom: "-100px", right: "-100px", zIndex: 0, filter: "blur(80px)" },
  container: { padding: "4rem 2rem", maxWidth: "1400px", margin: "0 auto", position: "relative", zIndex: 1 },
  header: { textAlign: "center", marginBottom: "4rem" },
  brand: { display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "1rem" },
  logoCircle: { background: "#0f172a", padding: "10px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" },
  title: { fontSize: "3rem", fontWeight: "900", letterSpacing: "-0.05em", margin: 0 },
  subtitle: { color: "#94a3b8", fontSize: "1rem" },
  searchWrapper: { display: "flex", alignItems: "center", background: "rgba(15, 23, 42, 0.6)", padding: "6px 10px 6px 20px", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.1)", width: "550px", backdropFilter: "blur(10px)" },
  inputRow: { display: "flex", justifyContent: "center", marginBottom: "5rem" },
  input: { flex: 1, border: "none", outline: "none", background: "none", color: "#fff", fontSize: "1rem", padding: "10px" },
  button: { background: "#fff", color: "#000", border: "none", width: "45px", height: "45px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  contentLayout: { display: "grid", gridTemplateColumns: "450px 1fr", gap: "3rem", alignItems: "start" },
  cardSection: { position: "sticky", top: "2rem" },
  storyCard: { background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(20px)", padding: "3rem", borderRadius: "32px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  badge: { fontSize: "0.65rem", fontWeight: "900", padding: "4px 12px", borderRadius: "20px", textTransform: "uppercase" },
  cardTitle: { fontSize: "2.8rem", fontWeight: "900", color: "#fff", margin: "0 0 1.5rem 0" },
  storyText: { lineHeight: "1.8", color: "#94a3b8", fontSize: "1.1rem" },
  saveBtn: { background: "none", border: "none", cursor: "pointer" },
  expandButton: { marginTop: "2.5rem", width: "100%", padding: "14px", background: "#fff", color: "#000", border: "none", borderRadius: "16px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  graphCanvas: { height: "650px", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(5px)", borderRadius: "32px", border: "1px solid rgba(255,255,255,0.05)" },
  graphHint: { textAlign: "center", marginTop: "1.5rem", color: "#475569", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
  libraryContainer: { marginTop: "8rem", background: "rgba(15, 23, 42, 0.3)", padding: "4rem 3rem", borderRadius: "48px", border: "1px solid rgba(255,255,255,0.05)" },
  libHeader: { fontSize: "0.8rem", fontWeight: "900", marginBottom: "3rem", color: "#64748b", letterSpacing: "0.2em", display: "flex", alignItems: "center", gap: "10px" },
  libraryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem" },
  miniCard: { background: "#0f172a", padding: "2rem", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" },
  miniCardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" },
  miniCardTitle: { fontSize: "1.3rem", fontWeight: "800", margin: 0, color: "#fff" },
  revisit: { color: "#60a5fa", fontSize: "0.85rem", marginTop: "1.5rem", fontWeight: "700" },
  loader: { textAlign: "center", padding: "10rem", color: "#60a5fa", fontSize: "1.1rem", fontWeight: "700" }
};

export default App;