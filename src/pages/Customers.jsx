import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const EMPTY_FORM = {
  full_name: "",
  email: "",
  phone: "",
  city: "",
  country: "",
  address: "",
  company_name: "",
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select(`
        id,
        full_name,
        email,
        phone,
        city,
        country,
        address,
        company_name,
        created_at,
        shipments (count)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) setCustomers(data);
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
        .from("customers")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editId);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("customers").insert([form]);
      if (error) { setError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModal(false);
    setForm(EMPTY_FORM);
    setEditId(null);
    fetchCustomers();
  };

  const handleEdit = (customer) => {
    setForm({
      full_name: customer.full_name,
      email: customer.email || "",
      phone: customer.phone || "",
      city: customer.city || "",
      country: customer.country || "",
      address: customer.address || "",
      company_name: customer.company_name || "",
    });
    setEditId(customer.id);
    setError("");
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    await supabase.from("customers").delete().eq("id", id);
    fetchCustomers();
  };

  const filtered = customers.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.city && c.city.toLowerCase().includes(search.toLowerCase())) ||
    (c.country && c.country.toLowerCase().includes(search.toLowerCase())) ||
    (c.company_name && c.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  const getInitials = (name) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const avatarColors = ["#e0e7ff", "#fce7f3", "#dcfce7", "#fef9c3", "#dbeafe", "#ffe4e6"];
  const textColors = ["#4f46e5", "#db2777", "#16a34a", "#ca8a04", "#2563eb", "#e11d48"];

  return (
    <div style={{ padding: 28, fontFamily: "'DM Sans', sans-serif", background: "#f8f9fb", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .customer-row:hover { background: #f8fafc; }
        .action-btn:hover { opacity: 0.75; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; }
        input:focus { border-color: #6366f1 !important; outline: none; }
        .search-input:focus { border-color: #6366f1 !important; outline: none; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px", margin: 0 }}>Customers</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            {customers.length} total customers
          </p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditId(null); setError(""); setShowModal(true); }}
          style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Add Customer
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          className="search-input"
          placeholder="Search by name, email, company, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: 320, padding: "9px 14px", borderRadius: 9,
            border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a",
            background: "#fff",
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            {search ? "No customers match your search." : "No customers yet. Add your first customer!"}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Customer", "Company", "Email", "Phone", "Location", "Shipments", "Joined", ""].map((h) => (
                  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer, i) => {
                const colorIndex = i % avatarColors.length;
                return (
                  <tr key={customer.id} className="customer-row" style={{ borderTop: "1px solid #f8fafc" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%",
                          background: avatarColors[colorIndex],
                          color: textColors[colorIndex],
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 700, fontSize: 12, flexShrink: 0,
                        }}>
                          {getInitials(customer.full_name)}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{customer.full_name}</div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#475569" }}>{customer.company_name || "—"}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#475569" }}>{customer.email || "—"}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#475569" }}>{customer.phone || "—"}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#475569" }}>
                      {customer.city && customer.country
                        ? `${customer.city}, ${customer.country}`
                        : customer.city || customer.country || "—"}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ background: "#f1f5f9", color: "#475569", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                        {customer.shipments?.[0]?.count ?? 0}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#94a3b8" }}>
                      {new Date(customer.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="action-btn"
                          onClick={() => handleEdit(customer)}
                          style={{ background: "#f1f5f9", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#475569", cursor: "pointer", fontWeight: 500 }}
                        >
                          Edit
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => handleDelete(customer.id)}
                          style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#dc2626", cursor: "pointer", fontWeight: 500 }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 32, width: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 24 }}>
              {editId ? "Edit Customer" : "Add New Customer"}
            </h3>

            {error && (
              <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Full Name *", key: "full_name", placeholder: "Ahmed Hassan", span: 2 },
                { label: "Company", key: "company_name", placeholder: "Acme Logistics", span: 2 },
                { label: "Email", key: "email", placeholder: "ahmed@example.com" },
                { label: "Phone", key: "phone", placeholder: "+252612345678" },
                { label: "City", key: "city", placeholder: "Mogadishu" },
                { label: "Country", key: "country", placeholder: "Somalia" },
                { label: "Address", key: "address", placeholder: "KM4, Hodan District", span: 2 },
              ].map((f) => (
                <div key={f.key} style={{ gridColumn: f.span === 2 ? "1 / -1" : "auto" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>{f.label}</label>
                  <input
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a" }}
                  />
                </div>
              ))}
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
                {saving ? "Saving..." : editId ? "Update Customer" : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
