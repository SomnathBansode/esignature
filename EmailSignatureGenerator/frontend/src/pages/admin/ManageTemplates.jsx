// frontend/src/pages/admin/ManageTemplates.jsx
import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { useNavigate } from "react-router-dom";

const ManageTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    thumbnail: "",
    description: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api("/admin/templates");
        setTemplates(response);
      } catch (error) {
        console.error("Error fetching templates", error);
      }
    };

    fetchTemplates();
  }, []);

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    try {
      const response = await api("/admin/templates", {
        method: "POST",
        body: formData,
      });
      setTemplates((prev) => [...prev, response]); // Add new template to state
      setFormData({ name: "", thumbnail: "", description: "" }); // Reset form
    } catch (error) {
      console.error("Error adding template", error);
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await api(`/admin/templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((template) => template.id !== id)); // Remove deleted template from state
    } catch (error) {
      console.error("Error deleting template", error);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template); // Set the template for editing
    setFormData({
      name: template.name,
      thumbnail: template.thumbnail,
      description: template.description,
    });
  };

  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
    try {
      const response = await api(`/admin/templates/${editingTemplate.id}`, {
        method: "PUT",
        body: formData,
      });
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === editingTemplate.id ? response : template
        )
      );
      setEditingTemplate(null); // Clear editing state
      setFormData({ name: "", thumbnail: "", description: "" }); // Reset form
    } catch (error) {
      console.error("Error updating template", error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">Manage Templates</h2>

      <form
        onSubmit={editingTemplate ? handleUpdateTemplate : handleAddTemplate}
      >
        <div className="space-y-4">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Template Name"
            className="w-full border p-2 rounded"
          />
          <input
            type="text"
            name="thumbnail"
            value={formData.thumbnail}
            onChange={(e) =>
              setFormData({ ...formData, thumbnail: e.target.value })
            }
            placeholder="Thumbnail URL"
            className="w-full border p-2 rounded"
          />
          <textarea
            name="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Template Description"
            className="w-full border p-2 rounded"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {editingTemplate ? "Update Template" : "Add Template"}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-4">All Templates</h3>
        <ul>
          {templates.map((template) => (
            <li
              key={template.id}
              className="flex justify-between items-center p-4 border-b"
            >
              <div>{template.name}</div>
              <div>
                <button
                  onClick={() => handleEditTemplate(template)}
                  className="bg-yellow-500 text-white px-4 py-2 rounded mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ManageTemplates;
