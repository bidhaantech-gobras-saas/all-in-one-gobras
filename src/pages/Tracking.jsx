import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const STATUS_STEPS = ["pending", "booked", "in_transit", "arrived", "delivered"];

const stepLabel = (s) => {
  if (s === "pending") return "Pending";
  if (s === "booked") return "Booked";
  if (s === "in_transit") return "In Transit";
  if (s === "arrived") return "Arrived";
  if (s === "delivered") return "Delivered";
  return s;
};

const stepIcon = (s) => {
  if (s === "pending") return "🕐";
  if (s === "booked") return "📋";
  if (s === "in_transit") return "🚢";
  if (s === "arrived") return "📍";
  if (s === "delivered") return "✅";
  return "●";
};

const modeIcon = (mode) => {
  if (mode === "air") return "✈️";
  if (mode === "sea") return "🚢";
  return "🚛";
};

const paymentStyle = (status) => {
  if (status === "paid") return { background: "#dcfce7", color: "#16a34a" };
  if (status === "partial") return { background: "#fef9c3", color: "#ca8a04" };
  return { background: "#fee2e2", color: "#dc2626" };
};

export default function Tracking() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shipments")
      .select(`
        id, shipment_number, tracking_number, mode, status, payment_status,
        origin_city, origin_country, destination_city, destination_country,
        carrier, cargo_description, packages, weight_kg,
        shipped_date, estimated_delivery, notes, created_at,
        customers (id, full_name, email, phone)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setShipments(data);
      if (selected) {
        const updated = data.find((s) => s.id === selected.id);
        if (updated) setSelected(updated);
      }
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (shipmentId, newStatus) => {
    setUpdating(true);
    const { error } = await supabase
      .from("shipments")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", shipmentId);

    if (!error) {
      await fetchShipments();
    }
    setUpdating(false);
  };

  const filtered = shipments.filter((s) =>
    (s.shipment_number && s.shipment_number.toLowerCase().includes(search.toLowerCase())) ||
    (s.tracking_number && s.tracking_number.toLowerCase().includes(search.toLowerCase())) ||
    (s.customers?.full_name && s.customers.full_name.toLowerCase().includes(search.toLowerCase())) ||
    (s.origin_city && s.origin_city.toLowerCase().includes(search.toLowerCase())) ||
    (s.destination_city && s.destination_city.toLowerCase().includes(search.toLowerCase()))
  );

  const getStepIndex = (status) => STATUS_STEPS.indexOf(status);

  return (
    <div style={{ padding: 28, fontFamily: "'DM Sans', sans-serif", background: "#f8f9fb", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .ship-card { transition: all 0.15s ease; cursor: pointer; border: 1.5px solid #f1f5f9; }
        .ship-card:hover { border-color: #6366f1 !important; box-shadow: 0 4px 16px rgba(99,102,241,0.08) !important; }
        .ship-card.selected { border-color: #6366f1 !important; background: #fafaff !important; }
        .status-btn { transition: all 0.15s; cursor: pointer; }
        .status-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        input:focus { border-color: #6366f1 !important; outline: none; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px", margin: 0 }}>Tracking</h1>
        <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Track and update shipment status in real-time</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20, alignItems: "start" }}>

        {/* Left - Shipment List */}
        <div>
          <input
            placeholder="Search shipment #, customer, route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#fff", marginBottom: 16 }}
          />

          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading shipments...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No shipments found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((s) => {
                const stepIndex = getStepIndex(s.status);
                const isCancelled = s.status === "cancelled";
                return (
                  <div
                    key={s.id}
                    className={`ship-card${selected?.id === s.id ? " selected" : ""}`}
                    onClick={() => setSelected(s)}
                    style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>
                            {s.shipment_number || "—"}
                          </span>
                          <span style={{ fontSize: 14 }}>{modeIcon(s.mode)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{s.customers?.full_name || "—"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ ...paymentStyle(s.payment_status), padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>
                          {s.payment_status ? s.payment_status.charAt(0).toUpperCase() + s.payment_status.slice(1) : "Unpaid"}
                        </span>
                      </div>
                    </div>

                    {/* Route */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 12, color: "#475569" }}>
                      <span style={{ fontWeight: 600 }}>{s.origin_city}, {s.origin_country}</span>
                      <span style={{ color: "#cbd5e1" }}>→</span>
                      <span style={{ fontWeight: 600 }}>{s.destination_city}, {s.destination_country}</span>
                    </div>

                    {/* Progress Bar */}
                    {!isCancelled ? (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          {STATUS_STEPS.map((step, i) => (
                            <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: "50%",
                                background: i <= stepIndex ? "#0f172a" : "#f1f5f9",
                                color: i <= stepIndex ? "#fff" : "#94a3b8",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 13, fontWeight: 700, zIndex: 1,
                                border: i === stepIndex ? "2px solid #6366f1" : "none",
                              }}>
                                {i <= stepIndex ? "✓" : i + 1}
                              </div>
                              <div style={{ fontSize: 9, color: i <= stepIndex ? "#0f172a" : "#94a3b8", marginTop: 4, fontWeight: i === stepIndex ? 700 : 400, textAlign: "center" }}>
                                {stepLabel(step)}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ position: "relative", height: 3, background: "#f1f5f9", borderRadius: 4, margin: "0 14px", marginTop: -38, marginBottom: 28 }}>
                          <div style={{ height: "100%", background: "#0f172a", borderRadius: 4, width: `${(stepIndex / (STATUS_STEPS.length - 1)) * 100}%`, transition: "width 0.4s ease" }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "#fee2e2", color: "#dc2626", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, textAlign: "center" }}>
                        ❌ Cancelled
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right - Detail Panel */}
        <div style={{ position: "sticky", top: 20 }}>
          {!selected ? (
            <div style={{ background: "#fff", borderRadius: 12, padding: 40, textAlign: "center", border: "1.5px dashed #e2e8f0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 14, color: "#94a3b8" }}>Select a shipment to view details and update status</div>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              {/* Detail Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{selected.shipment_number}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{modeIcon(selected.mode)} {selected.mode ? selected.mode.charAt(0).toUpperCase() + selected.mode.slice(1) : "—"} Shipment</div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 18, color: "#94a3b8", cursor: "pointer" }}>×</button>
                </div>
              </div>

              <div style={{ padding: "20px 24px" }}>
                {/* Customer */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Customer</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{selected.customers?.full_name || "—"}</div>
                  {selected.customers?.email && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{selected.customers.email}</div>}
                  {selected.customers?.phone && <div style={{ fontSize: 12, color: "#64748b" }}>{selected.customers.phone}</div>}
                </div>

                {/* Route */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Route</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ background: "#f1f5f9", borderRadius: 8, padding: "8px 12px", flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>From</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{selected.origin_city}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{selected.origin_country}</div>
                    </div>
                    <div style={{ fontSize: 18, color: "#cbd5e1" }}>→</div>
                    <div style={{ background: "#f1f5f9", borderRadius: 8, padding: "8px 12px", flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>To</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{selected.destination_city}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{selected.destination_country}</div>
                    </div>
                  </div>
                </div>

                {/* Cargo */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Cargo</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Description", value: selected.cargo_description || "—" },
                      { label: "Carrier", value: selected.carrier || "—" },
                      { label: "Packages", value: selected.packages ? `${selected.packages} pkgs` : "—" },
                      { label: "Weight", value: selected.weight_kg ? `${selected.weight_kg} kg` : "—" },
                    ].map((item) => (
                      <div key={item.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{item.label}</div>
                        <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500, marginTop: 2 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking # */}
                {selected.tracking_number && (
                  <div style={{ marginBottom: 20, background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", border: "1px solid #dcfce7" }}>
                    <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 700, textTransform: "uppercase" }}>Tracking Number</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{selected.tracking_number}</div>
                  </div>
                )}

                {/* Update Status */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Update Status</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {STATUS_STEPS.map((step) => (
                      <button
                        key={step}
                        className="status-btn"
                        disabled={updating || selected.status === step}
                        onClick={() => handleStatusUpdate(selected.id, step)}
                        style={{
                          padding: "10px 12px", borderRadius: 8,
                          border: selected.status === step ? "2px solid #0f172a" : "1.5px solid #e2e8f0",
                          background: selected.status === step ? "#0f172a" : "#fff",
                          color: selected.status === step ? "#fff" : "#475569",
                          fontSize: 12, fontWeight: selected.status === step ? 700 : 500,
                          cursor: selected.status === step ? "default" : "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        {stepIcon(step)} {stepLabel(step)}
                      </button>
                    ))}
                    <button
                      className="status-btn"
                      disabled={updating || selected.status === "cancelled"}
                      onClick={() => handleStatusUpdate(selected.id, "cancelled")}
                      style={{
                        padding: "10px 12px", borderRadius: 8,
                        border: selected.status === "cancelled" ? "2px solid #dc2626" : "1.5px solid #fee2e2",
                        background: selected.status === "cancelled" ? "#fee2e2" : "#fff",
                        color: "#dc2626", fontSize: 12, fontWeight: 600,
                        cursor: selected.status === "cancelled" ? "default" : "pointer",
                        gridColumn: "1 / -1",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      ❌ Cancel Shipment
                    </button>
                  </div>
                </div>

                {/* Notes */}
                {selected.notes && (
                  <div style={{ marginTop: 16, background: "#fef9c3", borderRadius: 8, padding: "10px 14px", border: "1px solid #fef08a" }}>
                    <div style={{ fontSize: 10, color: "#ca8a04", fontWeight: 700, textTransform: "uppercase" }}>Notes</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{selected.notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
