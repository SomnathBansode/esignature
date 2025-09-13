// BrowseTemplates.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import TemplateCard from "../components/TemplateCard";

export default function BrowseTemplates() {
  const [templates, setTemplates] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api("/templates"); // Ensure you get templates from API
        setTemplates(response);
      } catch (error) {
        console.error("Error fetching templates", error);
      }
    };
    fetchTemplates();
  }, []);

  const handleUseTemplate = (templateId) => {
    navigate(`/create-signature?template=${templateId}`); // Redirect to Create Signature with template_id
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">Browse Templates</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            item={template}
            onUse={() => handleUseTemplate(template.id)} // Pass the template ID to handleUseTemplate
          />
        ))}
      </div>
    </div>
  );
}
