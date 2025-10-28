import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  WindPower as WindIcon,
  LocationOn as LocationIcon,
} from "@mui/icons-material";
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
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
            Turbine Assets
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your wind turbine fleet
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreate(true)}
          sx={{
            background: "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #0099cc 0%, #007799 100%)",
            },
          }}
        >
          Create Turbine
        </Button>
      </Box>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Turbine</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Name *"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Manufacturer"
              value={form.manufacturer}
              onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              fullWidth
            />
            <TextField
              label="MW Rating"
              type="number"
              value={form.mwRating}
              onChange={(e) => setForm({ ...form, mwRating: e.target.value })}
              fullWidth
            />
            <TextField
              label="Latitude"
              type="number"
              inputProps={{ step: "0.0001" }}
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              fullWidth
            />
            <TextField
              label="Longitude"
              type="number"
              inputProps={{ step: "0.0001" }}
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Grid container spacing={3}>
        {turbines.map((t) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.id}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: "linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(0, 153, 204, 0.1) 100%)",
                border: "1px solid rgba(0, 212, 255, 0.2)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 32px rgba(0, 212, 255, 0.3)",
                  borderColor: "rgba(0, 212, 255, 0.5)",
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <WindIcon sx={{ color: "primary.main", mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {t.name}
                  </Typography>
                </Box>
                
                {editingId === t.id ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                      label="Name *"
                      size="small"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                    <TextField
                      label="Manufacturer"
                      size="small"
                      value={editForm.manufacturer}
                      onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
                    />
                    <TextField
                      label="MW Rating"
                      type="number"
                      size="small"
                      value={editForm.mwRating}
                      onChange={(e) => setEditForm({ ...editForm, mwRating: e.target.value })}
                    />
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextField
                        label="Latitude"
                        type="number"
                        size="small"
                        fullWidth
                        inputProps={{ step: "0.0001" }}
                        value={editForm.lat}
                        onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })}
                      />
                      <TextField
                        label="Longitude"
                        type="number"
                        size="small"
                        fullWidth
                        inputProps={{ step: "0.0001" }}
                        value={editForm.lng}
                        onChange={(e) => setEditForm({ ...editForm, lng: e.target.value })}
                      />
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        size="small"
                        onClick={() => handleUpdate(t.id)}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        size="small"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Manufacturer: {t.manufacturer || "N/A"}
                    </Typography>
                    {t.mwRating && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Rating: {t.mwRating} MW
                      </Typography>
                    )}
                    {t.lat && t.lng && (
                      <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                        <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: "primary.main" }} />
                        <Typography variant="caption" color="text.secondary">
                          {t.lat}, {t.lng}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
              
              {editingId !== t.id && (
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(t)}
                    sx={{ color: "primary.main" }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(t.id, t.name)}
                    sx={{ color: "error.main" }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      {turbines.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center", mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No turbines yet. Create your first one!
          </Typography>
        </Paper>
      )}
    </Box>
  );
};