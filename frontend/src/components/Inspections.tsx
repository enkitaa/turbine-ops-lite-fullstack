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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  Flight as FlightIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import type { Inspection, Turbine, Finding } from "./types";

interface InspectionsPageProps {
  inspections: Inspection[];
  turbines: Turbine[];
  onReload: (filters?: FilterState) => void;
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

interface FilterState {
  turbineId: string;
  startDate: string;
  endDate: string;
  dataSource: string;
  searchNotes: string;
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
  const [filters, setFilters] = useState<FilterState>({
    turbineId: "",
    startDate: "",
    endDate: "",
    dataSource: "",
    searchNotes: "",
  });

  const applyFilters = () => {
    onReload(filters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      turbineId: "",
      startDate: "",
      endDate: "",
      dataSource: "",
      searchNotes: "",
    };
    setFilters(emptyFilters);
    onReload(emptyFilters);
  };

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
      <Box>
        <Button
          startIcon={<DescriptionIcon />}
          onClick={() => setSelectedInspection(null)}
          sx={{ mb: 3 }}
        >
          ← Back to Inspections
        </Button>
        
        <Paper
          sx={{
            p: 4,
            background: "linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(0, 153, 204, 0.1) 100%)",
            border: "1px solid rgba(0, 212, 255, 0.2)",
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Inspection Details
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Turbine
              </Typography>
              <Typography variant="h6">{selectedInspection.turbine.name}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Date
              </Typography>
              <Typography variant="h6">
                  {new Date(selectedInspection.date).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Data Source
              </Typography>
              <Chip
                icon={selectedInspection.dataSource === "DRONE" ? <FlightIcon /> : <PersonIcon />}
                label={selectedInspection.dataSource}
                sx={{ mt: 1 }}
              />
            </Grid>
            {selectedInspection.inspectorName && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Inspector
                </Typography>
                <Typography variant="h6">{selectedInspection.inspectorName}</Typography>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Findings ({selectedInspection.findings.length})
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={() => addFinding(selectedInspection.id)}
              >
                Add Finding
              </Button>
            </Box>

            {selectedInspection.findings.length === 0 ? (
              <Typography color="text.secondary">No findings recorded.</Typography>
            ) : (
              <Grid container spacing={2}>
                {selectedInspection.findings.map((f) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={f.id}>
                    <Card
                      sx={{
                        background: "rgba(0, 0, 0, 0.2)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 1 }}>{f.category}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Severity: {f.severity}/10
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Estimated Cost: ${f.estimatedCost}
                        </Typography>
                        {f.notes && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {f.notes}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Repair Plan
              </Typography>
            </Box>

            {selectedInspection.repairPlan ? (
              <Paper
                sx={{
                  p: 3,
                  background: "linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 153, 204, 0.15) 100%)",
                  border: "1px solid rgba(0, 212, 255, 0.3)",
                }}
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Priority
                    </Typography>
                    <Chip
                      label={selectedInspection.repairPlan.priority}
                      color={selectedInspection.repairPlan.priority === "HIGH" ? "error" : selectedInspection.repairPlan.priority === "MEDIUM" ? "warning" : "success"}
                      sx={{ mt: 1 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Estimated Cost
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      ${selectedInspection.repairPlan.totalEstimatedCost}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            ) : (
              <Button
                variant="contained"
                fullWidth
                onClick={() => generateRepairPlan(selectedInspection.id)}
              >
                Generate Repair Plan
              </Button>
            )}
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
            Inspections
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and analyze turbine inspections
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
          Create Inspection
        </Button>
      </Box>

      <Paper
        sx={{
          p: 3,
          mb: 4,
          background: "rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
          <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SearchIcon /> Filter Inspections
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <FormControl fullWidth>
              <InputLabel>Turbine</InputLabel>
              <Select
                value={filters.turbineId}
                onChange={(e) => setFilters({ ...filters, turbineId: e.target.value })}
              >
                <MenuItem value="">All Turbines</MenuItem>
                {turbines.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <FormControl fullWidth>
              <InputLabel>Data Source</InputLabel>
              <Select
                value={filters.dataSource}
                onChange={(e) => setFilters({ ...filters, dataSource: e.target.value })}
              >
                <MenuItem value="">All Sources</MenuItem>
                <MenuItem value="DRONE">Drone</MenuItem>
                <MenuItem value="MANUAL">Manual</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <TextField
              label="Search Notes"
              placeholder="Search in findings..."
              fullWidth
              value={filters.searchNotes}
              onChange={(e) => setFilters({ ...filters, searchNotes: e.target.value })}
            />
          </Grid>
        </Grid>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            onClick={applyFilters}
            sx={{
              background: "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #0099cc 0%, #007799 100%)",
              },
            }}
          >
            Apply Filters
          </Button>
          <Button variant="outlined" onClick={clearFilters}>
            Clear Filters
          </Button>
        </Box>
      </Paper>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Inspection</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Turbine *</InputLabel>
              <Select
                value={form.turbineId}
                onChange={(e) => setForm({ ...form, turbineId: e.target.value })}
                required
              >
                <MenuItem value="">Select Turbine</MenuItem>
                {turbines.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Date *"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Inspector Name"
              value={form.inspectorName}
              onChange={(e) => setForm({ ...form, inspectorName: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Data Source</InputLabel>
              <Select
                value={form.dataSource}
                onChange={(e) => setForm({ ...form, dataSource: e.target.value as DataSourceType })}
              >
                <MenuItem value="DRONE">Drone</MenuItem>
                <MenuItem value="MANUAL">Manual</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Raw Package URL"
              value={form.rawPackageUrl}
              onChange={(e) => setForm({ ...form, rawPackageUrl: e.target.value })}
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
        {inspections.map((inspection) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={inspection.id}>
            <Card
              onClick={() => setSelectedInspection(inspection)}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: "linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(0, 153, 204, 0.1) 100%)",
                border: "1px solid rgba(0, 212, 255, 0.2)",
                cursor: "pointer",
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
                  <DescriptionIcon sx={{ color: "primary.main", mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
                    {inspection.turbine.name}
                  </Typography>
                </Box>
                
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <CalendarIcon sx={{ fontSize: 16, mr: 1, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary">
                    {new Date(inspection.date).toLocaleDateString()}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  {inspection.dataSource === "DRONE" ? (
                    <FlightIcon sx={{ fontSize: 16, mr: 1, color: "primary.main" }} />
                  ) : (
                    <PersonIcon sx={{ fontSize: 16, mr: 1, color: "text.secondary" }} />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {inspection.dataSource}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Findings: {inspection.findings.length}
                  </Typography>
                  {inspection.repairPlan && (
                    <Chip
                      label={inspection.repairPlan.priority}
                      size="small"
                      color={inspection.repairPlan.priority === "HIGH" ? "error" : inspection.repairPlan.priority === "MEDIUM" ? "warning" : "success"}
                    />
                  )}
                </Box>

                {inspection.repairPlan && (
                  <Typography variant="body2" color="primary.main" sx={{ mt: 1, fontWeight: 600 }}>
                    ${inspection.repairPlan.totalEstimatedCost}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {inspections.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center", mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No inspections yet. Create your first one!
          </Typography>
        </Paper>
      )}
    </Box>
  );
};