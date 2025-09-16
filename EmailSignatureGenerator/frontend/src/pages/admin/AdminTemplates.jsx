import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import {
  fetchTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
} from "../../redux/slices/templateSlice";

const AdminTemplates = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isAdminMode } = useSelector((state) => state.user);
  const { templates, loading, error } = useSelector((state) => state.template);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();

  useEffect(() => {
    if (!user || user.role !== "admin" || !isAdminMode) {
      navigate("/login", { replace: true });
      toast.error("Access denied. Admin only.");
    }
    dispatch(fetchTemplates());
  }, [user, isAdminMode, navigate, dispatch]);

  const onSubmit = async (data) => {
    try {
      const templateData = {
        name: data.name,
        thumbnail: data.thumbnail,
        tokens: JSON.parse(data.tokens || "{}"),
        html: data.html,
        placeholders: JSON.parse(data.placeholders || "[]"),
      };
      if (editingTemplate) {
        await dispatch(
          updateTemplate({ id: editingTemplate.id, ...templateData })
        ).unwrap();
        toast.success("Template updated successfully");
      } else {
        await dispatch(addTemplate(templateData)).unwrap();
        toast.success("Template added successfully");
      }
      reset();
      setEditingTemplate(null);
    } catch (err) {
      toast.error(err.message || "Failed to save template");
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setValue("name", template.name);
    setValue("thumbnail", template.thumbnail);
    setValue("tokens", JSON.stringify(template.tokens, null, 2));
    setValue("html", template.html);
    setValue("placeholders", JSON.stringify(template.placeholders, null, 2));
  };

  const handleDeleteTemplate = (templateId, name) => {
    setModalMessage(`Delete template ${name}? This action cannot be undone.`);
    setModalAction(() => async () => {
      try {
        await dispatch(deleteTemplate(templateId)).unwrap();
        toast.success("Template deleted successfully");
      } catch (err) {
        toast.error(err.message || "Failed to delete template");
      }
    });
    setIsModalOpen(true);
  };

  const handlePreviewTemplate = async (templateId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/templates/${templateId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPreviewTemplate(response.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to fetch template");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ClipLoader size={40} color="#2563eb" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Manage Templates
      </h1>
      <div className="mb-8 bg-white p-6 shadow rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          {editingTemplate ? "Edit Template" : "Add New Template"}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Thumbnail URL
            </label>
            <input
              type="text"
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                errors.thumbnail ? "border-red-500" : "border-gray-300"
              }`}
              {...register("thumbnail", {
                required: "Thumbnail URL is required",
              })}
            />
            {errors.thumbnail && (
              <p className="text-red-500 text-sm mt-1">
                {errors.thumbnail.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tokens (JSON)
            </label>
            <textarea
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                errors.tokens ? "border-red-500" : "border-gray-300"
              }`}
              rows="4"
              {...register("tokens", {
                validate: (value) => {
                  try {
                    JSON.parse(value || "{}");
                    return true;
                  } catch {
                    return "Invalid JSON format";
                  }
                },
              })}
            />
            {errors.tokens && (
              <p className="text-red-500 text-sm mt-1">
                {errors.tokens.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              HTML
            </label>
            <textarea
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                errors.html ? "border-red-500" : "border-gray-300"
              }`}
              rows="6"
              {...register("html", { required: "HTML is required" })}
            />
            {errors.html && (
              <p className="text-red-500 text-sm mt-1">{errors.html.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Placeholders (JSON Array)
            </label>
            <textarea
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                errors.placeholders ? "border-red-500" : "border-gray-300"
              }`}
              rows="4"
              {...register("placeholders", {
                validate: (value) => {
                  try {
                    const parsed = JSON.parse(value || "[]");
                    if (!Array.isArray(parsed)) return "Must be a JSON array";
                    return true;
                  } catch {
                    return "Invalid JSON format";
                  }
                },
              })}
            />
            {errors.placeholders && (
              <p className="text-red-500 text-sm mt-1">
                {errors.placeholders.message}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              {editingTemplate ? "Update Template" : "Add Template"}
            </button>
            {editingTemplate && (
              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(null);
                  reset();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thumbnail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.map((template) => (
              <tr key={template.id}>
                <td className="px-6 py-4 whitespace-nowrap">{template.name}</td>
                <td className="px-6 py-4">
                  {template.description || "No description"}
                </td>
                <td className="px-6 py-4">
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="h-10 w-10 object-cover rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handlePreviewTemplate(template.id)}
                    className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteTemplate(template.id, template.name)
                    }
                    className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {previewTemplate && (
        <div className="mt-8 bg-white p-6 shadow rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Template Preview: {previewTemplate.name}
          </h2>
          <div className="border p-4 rounded-lg">
            <div dangerouslySetInnerHTML={{ __html: previewTemplate.html }} />
            <p className="mt-2 text-gray-600">
              <strong>Placeholders:</strong>{" "}
              {JSON.stringify(previewTemplate.placeholders)}
            </p>
            <p className="mt-2 text-gray-600">
              <strong>Tokens:</strong> {JSON.stringify(previewTemplate.tokens)}
            </p>
            <button
              onClick={() => setPreviewTemplate(null)}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={modalAction}
        message={modalMessage}
      />
    </div>
  );
};

export default AdminTemplates;
