import { useState, useEffect } from "react";

export default function SignatureForm({ value, onChange }) {
  const [form, setForm] = useState(
    value || {
      name: "",
      title: "",
      email: "",
      phone: "",
      company: "", // Ensure company field is initialized
      website: "",
      avatarUrl: "",
      logoUrl: "",
      theme: { accent: "#0ea5e9", font: "Inter" }, // Default theme
    }
  );

  useEffect(() => {
    onChange?.(form); // Send form data back to parent whenever it changes
  }, [form, onChange]);

  const field = (k, type = "text") => (
    <input
      key={k}
      type={type}
      placeholder={k}
      value={form[k] ?? ""}
      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
      className="w-full border rounded p-2 text-sm"
    />
  );

  return (
    <div className="space-y-3">
      {[
        "name",
        "title",
        "email",
        "phone",
        "company", // Ensure company name is included
        "website",
        "avatarUrl",
        "logoUrl",
      ].map((k) => field(k))}
      <div className="flex items-center gap-3">
        <label className="text-sm">Accent</label>
        <input
          type="color"
          value={form?.theme?.accent || "#0ea5e9"}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              theme: { ...f.theme, accent: e.target.value },
            }))
          }
        />
      </div>
    </div>
  );
}
