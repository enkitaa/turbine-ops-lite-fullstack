import React, { useState } from "react";
import type { Turbine } from "./types";

interface TurbinesPageProps {
  turbines: Turbine[];
  onReload: () => void;
  token: string;
}

export const TurbinesPage: React.FC<TurbinesPageProps> = ({ turbines, onReload, token }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    manufacturer: "",
    mwRating: "",
    lat: "",
    lng: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    manufacturer: "",
    mwRating: "",
    lat: "",
    lng: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:4000"}/api/turbines`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          manufacturer: form.manufacturer || undefined,
          mwRating: form.mwRating ? parseFloat(form.mwRating) : undefined,
          lat: form.lat ? parseFloat(form.lat) : undefined,
          lng: form.lng ? parseFloat(form.lng) : undefined,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ name: "", manufacturer: "", mwRating: "", lat: "", lng: "" });
        onReload();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to create turbine");
      }
    } catch (error) {
      console.error("Failed to create turbine:", error);
      alert("Failed to create turbine");
    }
  };

  const handleEdit = (turbine: Turbine) => {
    setEditingId(turbine.id);
    setEditForm({
      name: turbine.name,
      manufacturer: turbine.manufacturer || "",
      mwRating: turbine.mwRating?.toString() || "",
      lat: turbine.lat?.toString() || "",
      lng: turbine.lng?.toString() || "",
    });
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:4000"}/api/turbines/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editForm.name,
          manufacturer: editForm.manufacturer || undefined,
          mwRating: editForm.mwRating ? parseFloat(editForm.mwRating) : undefined,
          lat: editForm.lat ? parseFloat(editForm.lat) : undefined,
          lng: editForm.lng ? parseFloat(editForm.lng) : undefined,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        onReload();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to update turbine");
      }
    } catch (error) {
      console.error("Failed to update turbine:", error);
      alert("Failed to update turbine");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete turbine "${name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:4000"}/api/turbines/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        onReload();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete turbine");
      }
    } catch (error) {
      console.error("Failed to delete turbine:", error);
      alert("Failed to delete turbine");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Turbines ({turbines.length})</h2>
        <button onClick={() => setShowCreate(!showCreate)} style={{ padding: "8px 16px" }}>
          {showCreate ? "Cancel" : "+ Create Turbine"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 16, padding: 16, border: "1px solid #ccc", borderRadius: 4 }}>
          <input
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <input
            placeholder="Manufacturer"
            value={form.manufacturer}
            onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <input
            type="number"
            placeholder="MW Rating"
            value={form.mwRating}
            onChange={(e) => setForm({ ...form, mwRating: e.target.value })}
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              step="0.0001"
              placeholder="Latitude"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              style={{ flex: 1, padding: 8 }}
            />
            <input
              type="number"
              step="0.0001"
              placeholder="Longitude"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              style={{ flex: 1, padding: 8 }}
            />
          </div>
          <button type="submit" style={{ width: "100%", padding: 8, marginTop: 8 }}>
            Create
          </button>
        </form>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {turbines.map((t) => (
          <div key={t.id} style={{ border: "1px solid #ccc", padding: 16, borderRadius: 4 }}>
            {editingId === t.id ? (
              <div>
                <input
                  placeholder="Name *"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  style={{ width: "100%", padding: 8, marginBottom: 8 }}
                />
                <input
                  placeholder="Manufacturer"
                  value={editForm.manufacturer}
                  onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
                  style={{ width: "100%", padding: 8, marginBottom: 8 }}
                />
                <input
                  type="number"
                  placeholder="MW Rating"
                  value={editForm.mwRating}
                  onChange={(e) => setEditForm({ ...editForm, mwRating: e.target.value })}
                  style={{ width: "100%", padding: 8, marginBottom: 8 }}
                />
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Latitude"
                    value={editForm.lat}
                    onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })}
                    style={{ flex: 1, padding: 8 }}
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Longitude"
                    value={editForm.lng}
                    onChange={(e) => setEditForm({ ...editForm, lng: e.target.value })}
                    style={{ flex: 1, padding: 8 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleUpdate(t.id)} style={{ flex: 1, padding: 8, backgroundColor: "#007bff", color: "white", border: "none", borderRadius: 4 }}>
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: 8, backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: 4 }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <h3>{t.name}</h3>
                    <p>Manufacturer: {t.manufacturer || "N/A"}</p>
                    {t.mwRating && <p>Rating: {t.mwRating} MW</p>}
                    {t.lat && t.lng && <p>Location: {t.lat}, {t.lng}</p>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => handleEdit(t)}
                    style={{ padding: "6px 12px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, t.name)}
                    style={{ padding: "6px 12px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
