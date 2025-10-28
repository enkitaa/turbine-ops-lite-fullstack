import React, { useState } from "react";
import type { Inspection, Turbine, Finding } from "./types";

interface InspectionsPageProps {
  inspections: Inspection[];
  turbines: Turbine[];
  onReload: () => void;
  token: string;
}

type DataSourceType = "DRONE" | "MANUAL";

interface FormState {
  turbineId: string;
  date: string;
  inspectorName: string;
  dataSource: DataSourceType;
  rawPackageUrl: string;
}

export const InspectionsPage: React.FC<InspectionsPageProps> = ({ inspections, turbines, onReload, token }) => {
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>({
    turbineId: "",
    date: "",
    inspectorName: "",
    dataSource: "DRONE" as const,
    rawPackageUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:4000"}/api/inspections`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      
      if (res.ok) {
        setShowCreate(false);
        setForm({ turbineId: "", date: "", inspectorName: "", dataSource: "DRONE", rawPackageUrl: "" });
        onReload();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to create inspection");
      }
    } catch (error) {
      console.error("Failed to create inspection:", error);
      alert("Failed to create inspection");
    }
  };

  const generateRepairPlan = async (inspectionId: string) => {
    try {
      const query = `
        mutation {
          generateRepairPlan(inspectionId: "${inspectionId}") {
            id
            priority
            totalEstimatedCost
          }
        }
      `;
      await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:4000"}/graphql`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
      onReload();
    } catch (error) {
      console.error("Failed to generate repair plan:", error);
    }
  };

  const addFinding = async (inspectionId: string) => {
    const category = prompt("Category (BLADE_DAMAGE, LIGHTNING, EROSION, UNKNOWN):");
    const severity = parseInt(prompt("Severity (1-10):") || "1");
    const cost = parseFloat(prompt("Estimated Cost:") || "0");
    const notes = prompt("Notes:");

    if (!category) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:4000"}/api/findings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inspectionId, category, severity, estimatedCost: cost, notes }),
      });
      
      if (res.ok) {
        onReload();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to add finding");
      }
    } catch (error) {
      console.error("Failed to add finding:", error);
      alert("Failed to add finding");
    }
  };

  if (selectedInspection) {
    return (
      <div>
        <button onClick={() => setSelectedInspection(null)} style={{ marginBottom: 16 }}>
          ← Back
        </button>
        <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 4 }}>
          <h2>Inspection Details</h2>
          <p>Turbine: {selectedInspection.turbine.name}</p>
          <p>Date: {new Date(selectedInspection.date).toLocaleDateString()}</p>
          <p>Data Source: {selectedInspection.dataSource}</p>
          {selectedInspection.inspectorName && <p>Inspector: {selectedInspection.inspectorName}</p>}

          <div style={{ marginTop: 16 }}>
            <h3>Findings</h3>
            {selectedInspection.findings.length === 0 && (
              <p>No findings yet. <button onClick={() => addFinding(selectedInspection.id)}>Add Finding</button></p>
            )}
            <ul style={{ listStyle: "none", padding: 0 }}>
              {selectedInspection.findings.map((f) => (
                <li key={f.id} style={{ border: "1px solid #ddd", padding: 8, marginBottom: 8, borderRadius: 4 }}>
                  <strong>{f.category}</strong> - Severity: {f.severity} - Cost: ${f.estimatedCost}
                  {f.notes && <p style={{ margin: 4, fontSize: "0.9em", color: "#666" }}>{f.notes}</p>}
                </li>
              ))}
            </ul>
            {selectedInspection.findings.length > 0 && (
              <button onClick={() => addFinding(selectedInspection.id)} style={{ marginTop: 8 }}>
                Add Another Finding
              </button>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <h3>Repair Plan</h3>
            {selectedInspection.repairPlan ? (
              <div style={{ backgroundColor: "#f0f0f0", padding: 12, borderRadius: 4 }}>
                <p><strong>Priority:</strong> {selectedInspection.repairPlan.priority}</p>
                <p><strong>Total Cost:</strong> ${selectedInspection.repairPlan.totalEstimatedCost}</p>
              </div>
            ) : (
              <button onClick={() => generateRepairPlan(selectedInspection.id)}>
                Generate Repair Plan
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Inspections ({inspections.length})</h2>
        <button onClick={() => setShowCreate(!showCreate)} style={{ padding: "8px 16px" }}>
          {showCreate ? "Cancel" : "+ Create Inspection"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 16, padding: 16, border: "1px solid #ccc", borderRadius: 4 }}>
          <select
            value={form.turbineId}
            onChange={(e) => setForm({ ...form, turbineId: e.target.value })}
            required
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          >
            <option value="">Select Turbine</option>
            {turbines.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <input
            placeholder="Inspector Name"
            value={form.inspectorName}
            onChange={(e) => setForm({ ...form, inspectorName: e.target.value })}
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <select
            value={form.dataSource}
            onChange={(e) => setForm({ ...form, dataSource: e.target.value as DataSourceType })}
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          >
            <option value="DRONE">Drone</option>
            <option value="MANUAL">Manual</option>
          </select>
          <input
            placeholder="Raw Package URL"
            value={form.rawPackageUrl}
            onChange={(e) => setForm({ ...form, rawPackageUrl: e.target.value })}
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <button type="submit" style={{ width: "100%", padding: 8, marginTop: 8 }}>
            Create
          </button>
        </form>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {inspections.map((inspection) => (
          <div
            key={inspection.id}
            style={{ border: "1px solid #ccc", padding: 16, borderRadius: 4, cursor: "pointer" }}
            onClick={() => setSelectedInspection(inspection)}
          >
            <h3>{inspection.turbine.name} - {new Date(inspection.date).toLocaleDateString()}</h3>
            <p>Source: {inspection.dataSource}</p>
            <p>Findings: {inspection.findings.length}</p>
            {inspection.repairPlan && (
              <p style={{ color: inspection.repairPlan.priority === "HIGH" ? "red" : inspection.repairPlan.priority === "MEDIUM" ? "orange" : "green" }}>
                Repair Plan: {inspection.repairPlan.priority} - ${inspection.repairPlan.totalEstimatedCost}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

