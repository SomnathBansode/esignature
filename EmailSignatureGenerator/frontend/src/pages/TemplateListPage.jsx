import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTemplates } from "../redux/slices/templateSlice";
import { Link } from "react-router-dom";

const TemplateListPage = () => {
  const dispatch = useDispatch();
  const {
    list: templates,
    loading,
    error,
  } = useSelector((state) => state.templates);

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  if (loading) return <div>Loading templates...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-8">
      <h2 className="text-4xl font-bold text-center">Available Templates</h2>
      <div className="mt-8 grid grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="border rounded-lg p-6 text-center">
            <h3 className="text-2xl font-semibold text-gray-700">
              {template.name}
            </h3>
            <p className="text-gray-500">
              {template.description || "No description"}
            </p>
            {template.thumbnail && (
              <img
                src={template.thumbnail}
                alt={template.name}
                className="w-full h-32 object-cover mt-2"
              />
            )}
            <Link
              to={`/signatures/create?templateId=${template.id}`}
              className="mt-4 inline-block bg-indigo-600 text-white px-6 py-3 rounded-full"
            >
              Use Template
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateListPage;
