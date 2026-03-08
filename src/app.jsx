import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "DM Sans, sans-serif", color: "#94a3b8" }}>
      Loading...
    </div>
  );

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard" element={session ? <Dashboard session={session} defaultPage="dashboard" /> : <Navigate to="/" replace />} />
        <Route path="/leads" element={session ? <Dashboard session={session} defaultPage="leads" /> : <Navigate to="/" replace />} />
        <Route path="/customers" element={session ? <Dashboard session={session} defaultPage="customers" /> : <Navigate to="/" replace />} />
        <Route path="/shipments" element={session ? <Dashboard session={session} defaultPage="shipments" /> : <Navigate to="/" replace />} />
        <Route path="/tracking" element={session ? <Dashboard session={session} defaultPage="tracking" /> : <Navigate to="/" replace />} />
        <Route path="/invoices" element={session ? <Dashboard session={session} defaultPage="invoices" /> : <Navigate to="/" replace />} />
        <Route path="/reports" element={session ? <Dashboard session={session} defaultPage="reports" /> : <Navigate to="/" replace />} />
        <Route path="/settings" element={session ? <Dashboard session={session} defaultPage="settings" /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
