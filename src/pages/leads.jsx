import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "lost"];
const SOURCE_OPTIONS = ["website", "referral", "social_media", "cold_call", "email_campaign", "other"];

const statusStyle = (status) => {
  if (status === "new") return { background: "#dbeafe", color: "#2563eb" };
  if (status === "contacted") return { background: "#fef9c3", color: "#ca8a04" };
  if (status === "qualified") return { background: "#dcfce7", color: "#16a34a" };
  if (status === "lost") return { background: "#fee2e2", color: "#dc2626" };
  return { background: "#f1f5f9", color: "#64748b" };
};

const statusLabel = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const sourceLabel = (s) => s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const EMPTY_FORM = {
  full_name: "",
  email: "",
  phone: "",
  company_name: "",
  status: "new",
  source: "website",
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setLeads(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      setError("Full name is required");
      return;
    }
    setSaving(true);
    setError("");

    if (editId) {
      const { error } = await supabase
        .from("leads")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editId);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from("leads").insert([form]);
      if (error) setError(error.message);
    }

    setSaving(false);
    if (!error) {
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      fetchLeads();
    }
  };

  const handleEdit = (lead) => {
    setForm({
      full_name: lead.full_name,
      email: lead.email || "",
      phone: lead.phone || "",
      company_name: lead.company_name || "",
      status: lead.status,
      source: lead.source || "website",
    });
    setEditId(lead.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lead?")) return;
    await supabase.from("leads").delete().eq("id", id);
    fetchLeads();
  };

  const handleStatusChange = async (id, newStatus) => {
    await supabase.from("leads").update({ status: newStatus }).eq("id", id);
    fetchLeads();
  };

  const filtered = filterStatus === "all"
    ? leads
    : leads.filter((l) => l.status === filterStatus);

  const counts = {
    all: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    lost: leads.filter((l) => l.status === "lost").length,
  };

  return (
    <div style={{ padding: 28, fontFamily: "'DM Sans', sans-serif", background: "#f8f9fb", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .lead-row:hover { background: #f8fafc; }
        .action-btn:hover { opacity: 0.75; }
        .filter-tab { cursor: pointer; transition: all 0.15s; }
        .filter-tab:hover { background: #f1f5f9 !important; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; }
        input, select { outline: none; }
        input:focus, select:focus { border-color: #6366f1 !important; }
        .status-select { border: none; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px", margin: 0 }}>Leads</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Manage your potential customers</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditId(null); setError(""); setShowModal(true); }}
          style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Add Lead
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["all", ...STATUS_OPTIONS].map((s) => (
          <button
            key={s}
            className="filter-tab"
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "7px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
              fontSize: 13, fontWeight: filterStatus === s ? 600 : 400,
              background: filterStatus === s ? "#0f172a" : "#fff",
              color: filterStatus === s ? "#fff" : "#64748b",
              cursor: "pointer",
            }}
          >
            {statusLabel(s)} <span style={{ opacity: 0.6, fontSize: 11 }}>({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No leads found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Name", "Company", "Contact", "Source", "Status", "Date", ""].map((h) => (
                  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="lead-row" style={{ borderTop: "1px solid #f8fafc" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{lead.full_name}</div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "#475569" }}>{lead.company_name || "—"}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontSize: 13, color: "#475569" }}>{lead.email || "—"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{lead.phone || ""}</div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "#475569" }}>{sourceLabel(lead.source)}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ ...statusStyle(lead.status), padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "inline-block" }}>
                      <select
                        className="status-select"
                        value={lead.status}
                        style={{ color: statusStyle(lead.status).color }}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 12, color: "#94a3b8" }}>
                    {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="action-btn"
                        onClick={() => handleEdit(lead)}
                        style={{ background: "#f1f5f9", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#475569", cursor: "pointer", fontWeight: 500 }}
                      >
                        Edit
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => handleDelete(lead.id)}
                        style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#dc2626", cursor: "pointer", fontWeight: 500 }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 32, width: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 24 }}>
              {editId ? "Edit Lead" : "Add New Lead"}
            </h3>

            {error && (
              <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Full Name *", key: "full_name", placeholder: "Ahmed Hassan" },
                { label: "Company", key: "company_name", placeholder: "Acme Corp" },
                { label: "Email", key: "email", placeholder: "ahmed@example.com" },
                { label: "Phone", key: "phone", placeholder: "+252612345678" },
              ].map((f) => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>{f.label}</label>
                  <input
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a" }}
                  />
                </div>
              ))}

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#fff" }}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Source</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#fff" }}
                >
                  {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{sourceLabel(s)}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowModal(false); setError(""); }}
                style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, color: "#475569", cursor: "pointer", fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ background: "#0f172a", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 600 }}
              >
                {saving ? "Saving..." : editId ? "Update Lead" : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
