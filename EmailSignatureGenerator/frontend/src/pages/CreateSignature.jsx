import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../utils/api";
import SignatureForm from "../components/SignatureForm";
import SignaturePreview from "../components/SignaturePreview";

export default function CreateSignature() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const templateId = query.get("template");

  const [template, setTemplate] = useState(null);
  const [formData, setFormData] = useState(null); // Capture form data

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await api(`/templates/${templateId}`);
        setTemplate(response); // Fetch the template based on ID
      } catch (error) {
        console.error("Error fetching template", error);
        alert("Error fetching template: " + error.message);
      }
    };

    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const handleSave = async () => {
    if (!formData || !template) return;

    const token = localStorage.getItem("authToken");

    if (!token) {
      alert("You must be logged in to save the signature.");
      return;
    }

    try {
      const response = await api("/signatures", {
        method: "POST",
        body: {
          template_id: template.id,
          form_data: formData,
          html_code: generateHtmlSignature(formData), // Generate HTML signature here
        },
        headers: {
          Authorization: `Bearer ${token}`, // Add token in headers for authentication
        },
      });

      navigate("/my-signatures"); // Redirect after saving the signature
    } catch (error) {
      console.error("Error saving signature", error);
      alert("Error saving signature: " + error.message); // Provide feedback to the user
    }
  };

  if (!template) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 grid md:grid-cols-2 gap-6">
      <div>
        <SignatureForm value={formData} onChange={setFormData} />
      </div>
      <div className="space-y-3">
        <SignaturePreview form={formData} />
        <button
          onClick={handleSave}
          className="px-3 py-2 rounded bg-black text-white text-sm"
        >
          Save Signature
        </button>
      </div>
    </div>
  );
}

const generateHtmlSignature = (form) => {
  return `
    <table style="font-family: Inter, Arial, sans-serif; font-size: 14px; color: #111;">
      <tr>
        <td style="padding: 8px">
          <div style="color: ${form?.theme?.accent}; font-weight: 700;">${
    form?.name || "Your Name"
  }</div>
          <div style="opacity: .8;">${form?.title || "Title"}</div>
          <div style="font-size: 12px; line-height: 18px; margin-top: 6px;">
            <div><b>e:</b> ${form?.email || "you@company.com"}</div>
            <div><b>p:</b> ${form?.phone || "+00 0000 0000"}</div>
            <div><b>w:</b> ${form?.website || "company.com"}</div>
          </div>
          <div style="margin-top: 8px; height: 4px; background: ${
            form?.theme?.accent
          }; border-radius: 4px;"></div>
          <div style="margin-top: 10px; height: auto;">
            <img src="${
              form?.logoUrl || "default-logo.png"
            }" alt="Company Logo" style="width: 100px;" />
          </div>
        </td>
      </tr>
    </table>
  `;
};
