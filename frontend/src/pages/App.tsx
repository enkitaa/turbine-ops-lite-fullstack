import React, { useEffect, useState } from "react";
import { TurbinesPage } from "../components/Turbines";
import { InspectionsPage } from "../components/Inspections";
import type { Turbine, Inspection } from "../components/types";

type Page = "turbines" | "inspections" | "login";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export const App: React.FC = () => {
  const [page, setPage] = useState<Page>("login");
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [turbines, setTurbines] = useState<Turbine[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // SSE for real-time notifications
  useEffect(() => {
    if (!token) return;

    const eventSource = new EventSource(`${API_BASE}/api/events`);
    
    eventSource.addEventListener("ping", (event) => {
      console.log("SSE ping:", event.data);
    });

    eventSource.addEventListener("plan", (event) => {
      const data = JSON.parse(event.data);
      setNotification(`🎉 New Repair Plan generated for inspection ${data.inspectionId}!`);
      
      // Auto-reload inspections to show the new repair plan
      if (page === "inspections") {
        loadData();
      }
      
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    });

    return () => {
      eventSource.close();
    };
  }, [token, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [turbinesRes, inspectionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/turbines`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/inspections`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const turbinesData = await turbinesRes.json();
      const inspectionsData = await inspectionsRes.json();
      setTurbines(turbinesData);
      setInspections(inspectionsData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem("token", data.token);
        setPage("turbines");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      alert("Login failed");
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
    setPage("login");
  };

  if (page === "login") {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 24, borderBottom: "1px solid #ccc", paddingBottom: 16 }}>
        <h1>TurbineOps Lite</h1>
        <nav style={{ display: "flex", gap: 16, marginBottom: 8 }}>
          <button
            onClick={() => setPage("turbines")}
            style={{ padding: "8px 16px", backgroundColor: page === "turbines" ? "#007bff" : "#f0f0f0", color: page === "turbines" ? "white" : "black", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            Turbines
          </button>
          <button
            onClick={() => setPage("inspections")}
            style={{ padding: "8px 16px", backgroundColor: page === "inspections" ? "#007bff" : "#f0f0f0", color: page === "inspections" ? "white" : "black", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            Inspections
          </button>
          <button onClick={handleLogout} style={{ padding: "8px 16px", marginLeft: "auto" }}>
            Logout
          </button>
        </nav>
      </header>

      {notification && (
        <div style={{ 
          backgroundColor: "#28a745", 
          color: "white", 
          padding: "12px 16px", 
          borderRadius: 4, marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{notification}</span>
          <button 
            onClick={() => setNotification(null)}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "18px" }}
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {page === "turbines" && (
            <TurbinesPage turbines={turbines} token={token!} onReload={loadData} />
          )}
          {page === "inspections" && (
            <InspectionsPage inspections={inspections} turbines={turbines} token={token!} onReload={loadData} />
          )}
        </>
      )}
    </div>
  );
};

const LoginPage: React.FC<{ onLogin: (email: string, password: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 24, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Login</h2>
      <div style={{ marginBottom: 16 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />
      </div>
      <button
        onClick={() => onLogin(email, password)}
        style={{ width: "100%", padding: 8, cursor: "pointer", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: 4 }}
      >
        Login
      </button>
      <p style={{ fontSize: 12, color: "#666", marginTop: 16 }}>
        Try: admin@example.com / admin123
      </p>
    </div>
  );
};
