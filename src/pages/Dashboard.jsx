import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  LayoutDashboard,
  Users,
  Package,
  MapPin,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  RefreshCw,
  Target,
  FileText,
} from "lucide-react";
import Leads from "./leads";
import Customers from "./Customers";
import Shipments from "./Shipments";
import Tracking from "./Tracking";
import Invoices from "./Invoices";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "leads", label: "Leads", icon: <Target size={18} /> },
  { id: "customers", label: "Customers", icon: <Users size={18} /> },
  { id: "shipments", label: "Shipments", icon: <Package size={18} /> },
  { id: "tracking", label: "Tracking", icon: <MapPin size={18} /> },
  { id: "invoices", label: "Invoices", icon: <FileText size={18} /> },
  { id: "reports", label: "Reports", icon: <BarChart2 size={18} /> },
  { id: "settings", label: "Settings", icon: <Settings size={18} /> },
];

const topbarButtons = {
  dashboard: { label: "+ New Shipment" },
  leads: { label: "+ Add Lead" },
  customers: { label: "+ Add Customer" },
  shipments: { label: "+ New Shipment" },
  invoices: { label: "+ New Invoice" },
};

const statusStyle = (status) => {
  if (status === "delivered") return { background: "#dcfce7", color: "#16a34a" };
  if (status === "in_transit") return { background: "#dbeafe", color: "#2563eb" };
  if (status === "cancelled") return { background: "#fee2e2", color: "#dc2626" };
  return { background: "#fef9c3", color: "#ca8a04" };
};

const statusLabel = (status) => {
  if (status === "in_transit") return "In Transit";
  if (status === "delivered") return "Delivered";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
};

export default function Dashboard({ session, defaultPage = "dashboard" }) {
  const [active, setActive] = useState(defaultPage);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [stats, setStats] = useState({ total: 0, in_transit: 0, delivered: 0, pending: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from("shipments")
      .select(`
        id, tracking_number, status,
        origin_city, origin_country,
        destination_city, destination_country,
        weight_kg, shipped_date, created_at,
        customers ( full_name )
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) setShipments(data);

    const { data: allData } = await supabase.from("shipments").select("status");
    if (allData) {
      setStats({
        total: allData.length,
        in_transit: allData.filter((s) => s.status === "in_transit").length,
        delivered: allData.filter((s) => s.status === "delivered").length,
        pending: allData.filter((s) => s.status === "pending").length,
      });
    }
    setLoadingData(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleMenuClick = (id) => {
    setActive(id);
    navigate(`/${id}`);
  };

  const statCards = [
    { label: "Total Shipments", value: stats.total, color: "#6366f1" },
    { label: "In Transit", value: stats.in_transit, color: "#2563eb" },
    { label: "Delivered", value: stats.delivered, color: "#16a34a" },
    { label: "Pending", value: stats.pending, color: "#ca8a04" },
  ];

  const renderContent = () => {
    if (active === "leads") return <Leads />;
    if (active === "customers") return <Customers />;
    if (active === "shipments") return <Shipments />;
    if (active === "tracking") return <Tracking />;
    if (active === "invoices") return <Invoices />;

    // Default: Dashboard home
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {statCards.map((s) => (
            <div key={s.label} className="stat-card" style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: s.color, letterSpacing: "-1px" }}>
                {loadingData ? "—" : s.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Recent Shipments</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Latest 10 shipments</div>
            </div>
            <button onClick={fetchShipments} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 14px", fontSize: 12, color: "#64748b", cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {loadingData ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading shipments...</div>
          ) : shipments.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No shipments found. Add your first shipment!</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["Tracking #", "Customer", "Origin", "Destination", "Weight", "Status", "Date"].map((h) => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipments.map((row) => (
                  <tr key={row.id} className="table-row" style={{ borderTop: "1px solid #f8fafc" }}>
                    <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{row.tracking_number}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#475569" }}>{row.customers?.full_name || "—"}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#475569" }}>{row.origin_city}, {row.origin_country}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#475569" }}>{row.destination_city}, {row.destination_country}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#475569" }}>{row.weight_kg ? `${row.weight_kg} kg` : "—"}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ ...statusStyle(row.status), padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#94a3b8" }}>
                      {row.shipped_date
                        ? new Date(row.shipped_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#f8f9fb", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .menu-item { transition: all 0.15s ease; cursor: pointer; }
        .menu-item:hover { background: #f1f5f9 !important; }
        .menu-item.active { background: #0f172a !important; color: #fff !important; }
        .menu-item.active svg { color: #fff !important; }
        .stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
        .table-row:hover { background: #f8fafc; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: sidebarOpen ? 240 : 68, background: "#fff", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", transition: "width 0.25s ease", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>G</div>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", letterSpacing: "-0.3px" }}>Gobras</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Logistics Suite</div>
            </div>
          )}
        </div>

        <nav style={{ padding: "12px 10px", flex: 1, overflowY: "auto" }}>
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`menu-item${active === item.id ? " active" : ""}`}
              onClick={() => handleMenuClick(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, marginBottom: 2, color: active === item.id ? "#fff" : "#64748b", fontSize: 14, fontWeight: active === item.id ? 600 : 400, whiteSpace: "nowrap" }}
            >
              <span style={{ flexShrink: 0, display: "flex", alignItems: "center", color: active === item.id ? "#fff" : "#94a3b8" }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </div>
          ))}
        </nav>

        <div style={{ padding: "16px 10px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e0e7ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>A</div>
            {sidebarOpen && (
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Super Admin</div>
                <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.email}</div>
              </div>
            )}
          </div>
          <button onClick={handleLogout} style={{ width: "100%", marginTop: 8, background: "none", border: "1px solid #f1f5f9", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#94a3b8", cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <LogOut size={13} />
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, display: "flex", alignItems: "center" }}>
              <Menu size={20} />
            </button>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>
                {menuItems.find((m) => m.id === active)?.label || "Dashboard"}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>
          {topbarButtons[active] && (
            <button style={{ background: "#0f172a", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer" }}>
              {topbarButtons[active].label}
            </button>
          )}
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
