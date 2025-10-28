import React, { useEffect, useState } from "react";
import { 
  ThemeProvider, 
  createTheme, 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  Alert,
  Snackbar,
  IconButton,
  Button,
  Paper,
  CssBaseline
} from "@mui/material";
import { 
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Settings as SettingsIcon
} from "@mui/icons-material";
import { TurbinesPage } from "../components/Turbines";
import { InspectionsPage } from "../components/Inspections";
import type { Turbine, Inspection } from "../components/types";

type Page = "turbines" | "inspections" | "login";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#00d4ff",
      light: "#33ddff",
      dark: "#0099cc",
    },
    secondary: {
      main: "#ff6b35",
      light: "#ff8c5f",
      dark: "#cc5529",
    },
    background: {
      default: "#0a0e27",
      paper: "#1a1f3a",
    },
    text: {
      primary: "#ffffff",
      secondary: "#b0b0b0",
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "10px 24px",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderRadius: 12,
        },
      },
    },
  },
});

export const App: React.FC = () => {
  const [page, setPage] = useState<Page>("login");
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [turbines, setTurbines] = useState<Turbine[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; severity: "success" | "error" | "info" } | null>(null);

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
      setNotification({ 
        message: `🎉 New Repair Plan generated for inspection ${data.inspectionId}!`, 
        severity: "success" 
      });
      
      // Auto-reload inspections to show the new repair plan
      if (page === "inspections") {
        loadData();
      }
    });

    return () => {
      eventSource.close();
    };
  }, [token, page]);

  const loadData = async (filters?: any) => {
    setLoading(true);
    try {
      const turbinesRes = await fetch(`${API_BASE}/api/turbines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const searchParams = new URLSearchParams();
      if (filters) {
        if (filters.turbineId) searchParams.append("turbineId", filters.turbineId);
        if (filters.startDate) searchParams.append("startDate", filters.startDate);
        if (filters.endDate) searchParams.append("endDate", filters.endDate);
        if (filters.dataSource) searchParams.append("dataSource", filters.dataSource);
        if (filters.searchNotes) searchParams.append("searchNotes", filters.searchNotes);
      }
      
      const inspectionsUrl = `${API_BASE}/api/inspections${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      const inspectionsRes = await fetch(inspectionsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
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
        setNotification({ message: data.message || "Login failed", severity: "error" });
      }
    } catch (error) {
      setNotification({ message: "Login failed", severity: "error" });
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
    setPage("login");
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  if (page === "login") {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLogin={handleLogin} />
        {notification && (
          <Snackbar 
            open={!!notification} 
            autoHideDuration={5000} 
            onClose={handleCloseNotification}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: "100%" }}>
              {notification.message}
            </Alert>
          </Snackbar>
        )}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)" }}>
        <AppBar position="static" sx={{ backgroundColor: "rgba(26, 31, 58, 0.8)", backdropFilter: "blur(10px)" }}>
          <Toolbar>
            <DashboardIcon sx={{ mr: 2, color: "primary.main" }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
              TurbineOps Lite
            </Typography>
            <Button
              color="inherit"
              onClick={() => setPage("turbines")}
              sx={{ 
                mr: 1,
                backgroundColor: page === "turbines" ? "primary.main" : "transparent",
                color: page === "turbines" ? "background.paper" : "inherit",
                "&:hover": { 
                  backgroundColor: page === "turbines" ? "primary.dark" : "rgba(255, 255, 255, 0.1)" 
                }
              }}
            >
              Turbines
            </Button>
            <Button
              color="inherit"
              onClick={() => setPage("inspections")}
              sx={{ 
                mr: 1,
                backgroundColor: page === "inspections" ? "primary.main" : "transparent",
                color: page === "inspections" ? "background.paper" : "inherit",
                "&:hover": { 
                  backgroundColor: page === "inspections" ? "primary.dark" : "rgba(255, 255, 255, 0.1)" 
                }
              }}
            >
              Inspections
            </Button>
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        <Snackbar 
          open={!!notification} 
          autoHideDuration={5000} 
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert onClose={handleCloseNotification} severity={notification?.severity} sx={{ width: "100%" }}>
            {notification?.message}
          </Alert>
        </Snackbar>

        <Container maxWidth="xl" sx={{ py: 4 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
              <Typography>Loading...</Typography>
            </Box>
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
        </Container>
      </Box>
    </ThemeProvider>
  );
};

const LoginPage: React.FC<{ onLogin: (email: string, password: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)",
      }}
    >
      <Paper
        elevation={24}
        sx={{
          maxWidth: 450,
          width: "100%",
          p: 4,
          background: "rgba(26, 31, 58, 0.95)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: "primary.main" }}>
            Login
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Wind Turbine Asset Management Platform
          </Typography>
        </Box>

        <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "14px 16px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "16px",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "14px 16px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "16px",
            }}
          />
          <Button
            variant="contained"
            fullWidth
            onClick={() => onLogin(email, password)}
            sx={{
              mt: 2,
              py: 1.5,
              background: "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #0099cc 0%, #007799 100%)",
              },
            }}
          >
            Login
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", mt: 2 }}>
            Try: admin@example.com / admin123
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};