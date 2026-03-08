import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import InvoicePDF from "./InvoicePDF";

const EMPTY_FORM = {
  shipment_number: "",
  customer_id: "",
  mode: "sea",
  status: "pending",
  origin_city: "",
  origin_country: "",
  destination_city: "",
  destination_country: "",
  carrier: "",
  tracking_number: "",
  cargo_description: "",
  packages: "",
  weight_kg: "",
  payment_status: "unpaid",
  notes: "",
  shipped_date: "",
  estimated_delivery: "",
};

const MODE_OPTIONS = ["air", "sea", "land"];
const STATUS_OPTIONS = ["pending", "booked", "in_transit", "arrived", "delivered", "cancelled"];
const PAYMENT_OPTIONS = ["unpaid", "partial", "paid"];

const statusStyle = (status) => {
  if (status === "delivered") return { background: "#dcfce7", color: "#16a34a" };
  if (status === "in_transit") return { background: "#dbeafe", color: "#2563eb" };
  if (status === "arrived") return { background: "#e0e7ff", color: "#4f46e5" };
  if (status === "booked") return { background: "#f0fdf4", color: "#15803d" };
  if (status === "cancelled") return { background: "#fee2e2", color: "#dc2626" };
  return { background: "#fef9c3", color: "#ca8a04" };
};

const paymentStyle = (status) => {
  if (status === "paid") return { background: "#dcfce7", color: "#16a34a" };
  if (status === "partial") return { background: "#fef9c3", color: "#ca8a04" };
  return { background: "#fee2e2", color: "#dc2626" };
};

const modeIcon = (mode) => {
  if (mode === "air") return "✈️";
  if (mode === "sea") return "🚢";
  return "🚛";
};

const label = (str) => str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [invoiceShipment, setInvoiceShipment] = useState(null);

  useEffect(() => {
    fetchShipments();
    fetchCustomers();
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
        customers (id, full_name, email, phone, company_name, city, country)
      `)
      .order("created_at", { ascending: false });

    if (data) setShipments(data);
    setLoading(false);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from("customers").select("id, full_name").order("full_name");
    if (data) setCustomers(data);
  };

  const handleSave = async () => {
    if (!form.customer_id) { setError("Customer is required"); return; }
    if (!form.origin_city || !form.destination_city) { setError("Origin and destination are required"); return; }

    setSaving(true);
    setError("");

    const payload = {
      ...form,
      packages: form.packages ? parseInt(form.packages) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      shipped_date: form.shipped_date || null,
      estimated_delivery: form.estimated_delivery || null,
    };

    if (editId) {
      const { error } = await supabase.from("shipments").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editId);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("shipments").insert([payload]);
      if (error) { setError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModal(false);
    setForm(EMPTY_FORM);
    setEditId(null);
    fetchShipments();
  };

  const handleEdit = (s) => {
    setForm({
      shipment_number: s.shipment_number || "",
      customer_id: s.customers?.id || "",
      mode: s.mode || "sea",
      status: s.status || "pending",
      origin_city: s.origin_city || "",
      origin_country: s.origin_country || "",
      destination_city: s.destination_city || "",
      destination_country: s.destination_country || "",
      carrier: s.carrier || "",
      tracking_number: s.tracking_number || "",
      cargo_description: s.cargo_description || "",
      packages: s.packages || "",
      weight_kg: s.weight_kg || "",
      payment_status: s.payment_status || "unpaid",
      notes: s.notes || "",
      shipped_date: s.shipped_date || "",
      estimated_delivery: s.estimated_delivery || "",
    });
    setEditId(s.id);
    setError("");
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this shipment?")) return;
    await supabase.from("shipments").delete().eq("id", id);
    fetchShipments();
  };

  const filtered = shipments.filter((s) => {
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    const matchSearch =
      (s.shipment_number && s.shipment_number.toLowerCase().includes(search.toLowerCase())) ||
      (s.customers?.full_name && s.customers.full_name.toLowerCase().includes(search.toLowerCase())) ||
      (s.origin_city && s.origin_city.toLowerCase().includes(search.toLowerCase())) ||
      (s.destination_city && s.destination_city.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = shipments.filter((sh) => sh.status === s).length;
    return acc;
  }, {});

  const F = ({ label: l, children, span }) => (
    <div style={{ gridColumn: span === 2 ? "1 / -1" : "auto" }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>{l}</label>
      {children}
    </div>
  );

  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#fff", outline: "none" };
  const sectionTitle = (t) => (
    <div style={{ gridColumn: "1 / -1", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, marginBottom: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>{t}</div>
    </div>
  );

  // Show Invoice PDF view
  if (invoiceShipment) {
    return <InvoicePDF shipment={invoiceShipment} onBack={() => setInvoiceShipment(null)} />;
  }

  return (
    <div style={{ padding: 28, fontFamily: "'DM Sans', sans-serif", background: "#f8f9fb", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .ship-row:hover { background: #f8fafc; }
        .action-btn:hover { opacity: 0.75; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        input:focus, select:focus, textarea:focus { border-color: #6366f1 !important; outline: none; }
        .filter-tab:hover { background: #f1f5f9 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px", margin: 0 }}>Shipments</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{shipments.length} total shipments</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditId(null); setError(""); setShowModal(true); }}
          style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + New Shipment
        </button>
      </div>

      {/* Filters + Search */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <input
          placeholder="Search shipment, customer, route..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280, padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#fff", outline: "none" }}
        />
        {["all", ...STATUS_OPTIONS].map((s) => (
          <button
            key={s}
            className="filter-tab"
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
              fontSize: 12, fontWeight: filterStatus === s ? 600 : 400,
              background: filterStatus === s ? "#0f172a" : "#fff",
              color: filterStatus === s ? "#fff" : "#64748b", cursor: "pointer",
            }}
          >
            {label(s)} {s !== "all" && <span style={{ opacity: 0.6 }}>({counts[s] || 0})</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading shipments...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No shipments found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["Shipment #", "Customer", "Mode", "Route", "Cargo", "Weight", "Status", "Payment", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="ship-row" style={{ borderTop: "1px solid #f8fafc" }}>
                    <td style={{ padding: "13px 16px", fontSize: 12, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
                      {row.shipment_number || "—"}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>{row.customers?.full_name || "—"}</td>
                    <td style={{ padding: "13px 16px", fontSize: 14 }}>{modeIcon(row.mode)} {row.mode ? label(row.mode) : "—"}</td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "#475569" }}>
                      <div>{row.origin_city}, {row.origin_country}</div>
                      <div style={{ color: "#94a3b8", marginTop: 2 }}>→ {row.destination_city}, {row.destination_country}</div>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "#475569", maxWidth: 140 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.cargo_description || "—"}</div>
                      {row.packages && <div style={{ color: "#94a3b8", marginTop: 2 }}>{row.packages} pkgs</div>}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{row.weight_kg ? `${row.weight_kg} kg` : "—"}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ ...statusStyle(row.status), padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {label(row.status)}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ ...paymentStyle(row.payment_status), padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {label(row.payment_status || "unpaid")}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="action-btn" onClick={() => handleEdit(row)} style={{ background: "#f1f5f9", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#475569", cursor: "pointer", fontWeight: 500 }}>Edit</button>
                        <button className="action-btn" onClick={() => handleDelete(row.id)} style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#dc2626", cursor: "pointer", fontWeight: 500 }}>Delete</button>
                        {row.payment_status === "paid" && (
                          <button
                            className="action-btn"
                            onClick={() => setInvoiceShipment(row)}
                            style={{ background: "#dcfce7", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#16a34a", cursor: "pointer", fontWeight: 600 }}
                          >
                            🧾 Invoice
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 32, width: "100%", maxWidth: 640, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 24 }}>
              {editId ? "Edit Shipment" : "New Shipment"}
            </h3>

            {error && (
              <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {sectionTitle("Section 1 — Basic Info")}
              <F label="Shipment Number">
                <input value={form.shipment_number} onChange={(e) => setForm({ ...form, shipment_number: e.target.value })} placeholder="Auto-generated if empty" style={inputStyle} />
              </F>
              <F label="Customer *">
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} style={inputStyle}>
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </F>
              <F label="Mode">
                <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} style={inputStyle}>
                  {MODE_OPTIONS.map((m) => <option key={m} value={m}>{modeIcon(m)} {label(m)}</option>)}
                </select>
              </F>
              <F label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
              </F>

              {sectionTitle("Section 2 — Route")}
              <F label="Origin City *">
                <input value={form.origin_city} onChange={(e) => setForm({ ...form, origin_city: e.target.value })} placeholder="Mogadishu" style={inputStyle} />
              </F>
              <F label="Origin Country">
                <input value={form.origin_country} onChange={(e) => setForm({ ...form, origin_country: e.target.value })} placeholder="Somalia" style={inputStyle} />
              </F>
              <F label="Destination City *">
                <input value={form.destination_city} onChange={(e) => setForm({ ...form, destination_city: e.target.value })} placeholder="Dubai" style={inputStyle} />
              </F>
              <F label="Destination Country">
                <input value={form.destination_country} onChange={(e) => setForm({ ...form, destination_country: e.target.value })} placeholder="UAE" style={inputStyle} />
              </F>
              <F label="Carrier">
                <input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} placeholder="e.g. Emirates SkyCargo" style={inputStyle} />
              </F>
              <F label="Tracking Number">
                <input value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} placeholder="e.g. EK123456789" style={inputStyle} />
              </F>
              <F label="Shipped Date">
                <input type="date" value={form.shipped_date} onChange={(e) => setForm({ ...form, shipped_date: e.target.value })} style={inputStyle} />
              </F>
              <F label="Est. Delivery">
                <input type="date" value={form.estimated_delivery} onChange={(e) => setForm({ ...form, estimated_delivery: e.target.value })} style={inputStyle} />
              </F>

              {sectionTitle("Section 3 — Cargo")}
              <F label="Cargo Description" span={2}>
                <input value={form.cargo_description} onChange={(e) => setForm({ ...form, cargo_description: e.target.value })} placeholder="e.g. Electronics, Clothing, Food items" style={inputStyle} />
              </F>
              <F label="Packages">
                <input type="number" value={form.packages} onChange={(e) => setForm({ ...form, packages: e.target.value })} placeholder="0" min="0" style={inputStyle} />
              </F>
              <F label="Weight (kg)">
                <input type="number" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} placeholder="0.00" min="0" step="0.01" style={inputStyle} />
              </F>

              {sectionTitle("Section 4 — Payment & Notes")}
              <F label="Payment Status" span={2}>
                <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })} style={inputStyle}>
                  {PAYMENT_OPTIONS.map((p) => <option key={p} value={p}>{label(p)}</option>)}
                </select>
              </F>
              <F label="Notes" span={2}>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </F>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, color: "#475569", cursor: "pointer", fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ background: "#0f172a", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                {saving ? "Saving..." : editId ? "Update Shipment" : "Create Shipment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
