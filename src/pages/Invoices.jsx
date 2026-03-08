import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const statusStyle = (status) => {
  if (status === "paid") return { background: "#dcfce7", color: "#16a34a" };
  if (status === "cancelled") return { background: "#fee2e2", color: "#dc2626" };
  return { background: "#fef9c3", color: "#ca8a04" };
};

const modeIcon = (mode) => {
  if (mode === "air") return "✈️";
  if (mode === "sea") return "🚢";
  return "🚛";
};

const fmt = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

const fmtShort = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ amount: "", currency: "USD", due_date: "", notes: "", status: "issued" });

  useEffect(() => {
    fetchInvoices();
    fetchShipments();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number, amount, currency, status, issued_date, due_date, notes, created_at,
        shipments (
          id, shipment_number, mode, carrier, tracking_number,
          origin_city, origin_country, destination_city, destination_country,
          cargo_description, packages, weight_kg, shipped_date, estimated_delivery,
          customers ( full_name, email, phone, company_name, address, city, country )
        )
      `)
      .order("created_at", { ascending: false });

    if (data) setInvoices(data);
    setLoading(false);
  };

  const fetchShipments = async () => {
    const { data } = await supabase
      .from("shipments")
      .select(`id, shipment_number, customers(full_name)`)
      .order("created_at", { ascending: false });
    if (data) setShipments(data);
  };

  const handleCreate = async () => {
    if (!selectedShipment) { setError("Please select a shipment"); return; }
    setSaving(true);
    setError("");

    const invNum = "INV-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

    const { error: err } = await supabase.from("invoices").insert([{
      invoice_number: invNum,
      shipment_id: selectedShipment.id,
      customer_id: selectedShipment.customer_id,
      amount: form.amount ? parseFloat(form.amount) : 0,
      currency: form.currency,
      due_date: form.due_date || null,
      notes: form.notes,
      status: form.status,
    }]);

    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    setShowModal(false);
    setSelectedShipment(null);
    setForm({ amount: "", currency: "USD", due_date: "", notes: "", status: "issued" });
    fetchInvoices();
  };

  const handleStatusChange = async (id, status) => {
    await supabase.from("invoices").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    fetchInvoices();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    await supabase.from("invoices").delete().eq("id", id);
    fetchInvoices();
  };

  // ─── PDF Generator ───────────────────────────────────────────────
  const downloadPDF = (inv) => {
    const s = inv.shipments;
    const c = s?.customers;
    const today = fmt(new Date());

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice ${inv.invoice_number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; padding: 48px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
  .logo { font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -1px; }
  .logo span { color: #6366f1; }
  .company-info { font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.6; }
  .invoice-meta { text-align: right; }
  .invoice-title { font-size: 28px; font-weight: 700; color: #0f172a; letter-spacing: -1px; }
  .invoice-number { font-size: 13px; color: #6366f1; font-weight: 600; margin-top: 4px; font-family: monospace; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; }
  .badge-issued { background: #fef9c3; color: #ca8a04; }
  .badge-paid { background: #dcfce7; color: #16a34a; }
  .badge-cancelled { background: #fee2e2; color: #dc2626; }
  .divider { border: none; border-top: 1px solid #f1f5f9; margin: 32px 0; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 36px; }
  .section-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  .info-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .info-line { font-size: 12px; color: #475569; line-height: 1.7; }
  .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .meta-key { font-size: 12px; color: #94a3b8; }
  .meta-val { font-size: 12px; font-weight: 600; color: #0f172a; }
  .route-box { background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 28px; border: 1px solid #f1f5f9; }
  .route-inner { display: flex; align-items: center; gap: 16px; }
  .route-city { flex: 1; }
  .route-city-name { font-size: 16px; font-weight: 700; color: #0f172a; }
  .route-city-country { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .route-arrow { font-size: 22px; color: #cbd5e1; }
  .route-mode { font-size: 11px; color: #64748b; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 10px; text-align: center; margin-top: 10px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  thead tr { background: #0f172a; }
  thead th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  tbody tr { border-bottom: 1px solid #f8fafc; }
  tbody td { padding: 14px 16px; font-size: 13px; color: #475569; }
  tbody td:first-child { color: #0f172a; font-weight: 500; }
  .total-box { display: flex; justify-content: flex-end; margin-bottom: 36px; }
  .total-inner { background: #0f172a; color: #fff; border-radius: 12px; padding: 20px 28px; min-width: 240px; }
  .total-label { font-size: 12px; color: #94a3b8; margin-bottom: 6px; }
  .total-amount { font-size: 32px; font-weight: 800; letter-spacing: -1px; }
  .total-currency { font-size: 14px; color: #94a3b8; margin-left: 4px; }
  .notes-box { background: #fffbeb; border: 1px solid #fef08a; border-radius: 10px; padding: 16px 20px; margin-bottom: 36px; }
  .notes-label { font-size: 10px; font-weight: 700; color: #ca8a04; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .notes-text { font-size: 12px; color: #475569; line-height: 1.6; }
  .footer { border-top: 1px solid #f1f5f9; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-size: 13px; font-weight: 700; color: #0f172a; }
  .footer-note { font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div>
    <div class="logo">Gobras<span>.</span></div>
    <div class="company-info">
      Gobras Logistics Suite<br>
      logistics@gobras.com<br>
      www.gobras.com
    </div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-title">INVOICE</div>
    <div class="invoice-number">${inv.invoice_number}</div>
    <div class="badge badge-${inv.status}">${inv.status.toUpperCase()}</div>
  </div>
</div>

<hr class="divider">

<!-- Bill To + Invoice Info -->
<div class="two-col">
  <div>
    <div class="section-label">Bill To</div>
    <div class="info-name">${c?.full_name || "—"}</div>
    ${c?.company_name ? `<div class="info-line">${c.company_name}</div>` : ""}
    ${c?.email ? `<div class="info-line">${c.email}</div>` : ""}
    ${c?.phone ? `<div class="info-line">${c.phone}</div>` : ""}
    ${c?.city ? `<div class="info-line">${c.city}${c?.country ? ", " + c.country : ""}</div>` : ""}
  </div>
  <div>
    <div class="section-label">Invoice Details</div>
    <div class="meta-row"><span class="meta-key">Invoice #</span><span class="meta-val" style="font-family:monospace">${inv.invoice_number}</span></div>
    <div class="meta-row"><span class="meta-key">Shipment #</span><span class="meta-val" style="font-family:monospace">${s?.shipment_number || "—"}</span></div>
    <div class="meta-row"><span class="meta-key">Issued Date</span><span class="meta-val">${fmt(inv.issued_date)}</span></div>
    <div class="meta-row"><span class="meta-key">Due Date</span><span class="meta-val">${fmt(inv.due_date)}</span></div>
    <div class="meta-row"><span class="meta-key">Currency</span><span class="meta-val">${inv.currency || "USD"}</span></div>
  </div>
</div>

<!-- Route -->
${s ? `
<div class="section-label" style="margin-bottom:10px">Shipment Route</div>
<div class="route-box">
  <div class="route-inner">
    <div class="route-city">
      <div class="route-city-name">${s.origin_city || "—"}</div>
      <div class="route-city-country">${s.origin_country || ""}</div>
    </div>
    <div class="route-arrow">→</div>
    <div class="route-city" style="text-align:right">
      <div class="route-city-name">${s.destination_city || "—"}</div>
      <div class="route-city-country">${s.destination_country || ""}</div>
    </div>
  </div>
  ${s.mode ? `<div style="margin-top:12px"><span class="route-mode">${modeIcon(s.mode)} ${s.mode.charAt(0).toUpperCase() + s.mode.slice(1)} Freight${s.carrier ? " · " + s.carrier : ""}</span></div>` : ""}
</div>` : ""}

<!-- Cargo Table -->
<div class="section-label" style="margin-bottom:10px">Cargo Details</div>
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th>Tracking #</th>
      <th>Packages</th>
      <th>Weight</th>
      <th>Shipped</th>
      <th>Est. Delivery</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>${s?.cargo_description || "Freight Services"}</td>
      <td style="font-family:monospace">${s?.tracking_number || "—"}</td>
      <td>${s?.packages ? s.packages + " pkgs" : "—"}</td>
      <td>${s?.weight_kg ? s.weight_kg + " kg" : "—"}</td>
      <td>${fmtShort(s?.shipped_date)}</td>
      <td>${fmtShort(s?.estimated_delivery)}</td>
    </tr>
  </tbody>
</table>

<!-- Total -->
<div class="total-box">
  <div class="total-inner">
    <div class="total-label">Total Amount Due</div>
    <div>
      <span class="total-amount">${parseFloat(inv.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
      <span class="total-currency">${inv.currency || "USD"}</span>
    </div>
  </div>
</div>

<!-- Notes -->
${inv.notes ? `
<div class="notes-box">
  <div class="notes-label">Notes</div>
  <div class="notes-text">${inv.notes}</div>
</div>` : ""}

<!-- Footer -->
<div class="footer">
  <div class="footer-brand">Gobras Logistics Suite</div>
  <div class="footer-note">Generated on ${today} · Thank you for your business.</div>
</div>

</body>
</html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const filtered = invoices.filter((inv) => {
    const matchStatus = filterStatus === "all" || inv.status === filterStatus;
    const matchSearch =
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(search.toLowerCase())) ||
      (inv.shipments?.shipment_number && inv.shipments.shipment_number.toLowerCase().includes(search.toLowerCase())) ||
      (inv.shipments?.customers?.full_name && inv.shipments.customers.full_name.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const counts = { issued: 0, paid: 0, cancelled: 0 };
  invoices.forEach((inv) => { if (counts[inv.status] !== undefined) counts[inv.status]++; });

  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#fff", outline: "none" };

  return (
    <div style={{ padding: 28, fontFamily: "'DM Sans', sans-serif", background: "#f8f9fb", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .inv-row:hover { background: #f8fafc; }
        .action-btn:hover { opacity: 0.75; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        input:focus, select:focus, textarea:focus { border-color: #6366f1 !important; outline: none; }
        .filter-tab:hover { background: #f1f5f9 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px", margin: 0 }}>Invoices</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{invoices.length} total invoices</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(""); }}
          style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + New Invoice
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <input
          placeholder="Search invoice #, shipment, customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300, padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#fff", outline: "none" }}
        />
        {["all", "issued", "paid", "cancelled"].map((s) => (
          <button key={s} className="filter-tab" onClick={() => setFilterStatus(s)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12,
              fontWeight: filterStatus === s ? 600 : 400, background: filterStatus === s ? "#0f172a" : "#fff",
              color: filterStatus === s ? "#fff" : "#64748b", cursor: "pointer" }}>
            {s.charAt(0).toUpperCase() + s.slice(1)} {s !== "all" && <span style={{ opacity: 0.6 }}>({counts[s] || 0})</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading invoices...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No invoices found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["Invoice #", "Shipment", "Customer", "Amount", "Issued", "Due", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="inv-row" style={{ borderTop: "1px solid #f8fafc" }}>
                    <td style={{ padding: "13px 16px", fontSize: 12, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>{inv.invoice_number}</td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "#475569", fontFamily: "'DM Mono', monospace" }}>{inv.shipments?.shipment_number || "—"}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{inv.shipments?.customers?.full_name || "—"}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                      {parseFloat(inv.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{inv.currency}</span>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "#64748b" }}>{fmtShort(inv.issued_date)}</td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "#64748b" }}>{fmtShort(inv.due_date)}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                        style={{ ...statusStyle(inv.status), padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", outline: "none" }}
                      >
                        <option value="issued">Issued</option>
                        <option value="paid">Paid</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="action-btn" onClick={() => downloadPDF(inv)}
                          style={{ background: "#eff6ff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>
                          ↓ PDF
                        </button>
                        <button className="action-btn" onClick={() => handleDelete(inv.id)}
                          style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#dc2626", cursor: "pointer", fontWeight: 500 }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 32, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 24 }}>New Invoice</h3>

            {error && (
              <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Shipment *", key: "shipment" },
              ].map(() => (
                <div key="shipment">
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Shipment *</label>
                  <select
                    value={selectedShipment?.id || ""}
                    onChange={(e) => {
                      const s = shipments.find((sh) => sh.id === e.target.value);
                      setSelectedShipment(s || null);
                    }}
                    style={inputStyle}
                  >
                    <option value="">Select shipment</option>
                    {shipments.map((s) => (
                      <option key={s.id} value={s.id}>{s.shipment_number} — {s.customers?.full_name}</option>
                    ))}
                  </select>
                </div>
              ))}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Amount</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" min="0" step="0.01" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Currency</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={inputStyle}>
                    {["USD", "EUR", "GBP", "AED", "SAR", "KES", "SOS"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    <option value="issued">Issued</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, special instructions..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowModal(false); setError(""); }}
                style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, color: "#475569", cursor: "pointer", fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                style={{ background: "#0f172a", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                {saving ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
