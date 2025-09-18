import React, { useState } from "react";
import { Link } from "react-router-dom";

const TemplateGallery = ({ templates }) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const dummyData = {
    name: "John Doe",
    title: "Software Engineer",
    phone: "+1 (123) 456-7890",
    email: "john.doe@example.com",
    website: "https://johndoe.com",
    linkedin: "https://linkedin.com/in/johndoe",
    github: "https://github.com/johndoe",
    twitter: "https://twitter.com/johndoe",
    instagram: "https://instagram.com/johndoe",
  };

  const filteredTemplates =
    selectedCategory === "all"
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  const renderPreview = (html) => {
    let preview = html;
    Object.keys(dummyData).forEach((key) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, "g"), dummyData[key]);
    });
    return preview;
  };

  return (
    <div className="p-8">
      <h2 className="text-4xl font-bold text-center mb-6">
        Available Templates
      </h2>
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700">
          Filter by Category:
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="ml-2 p-2 border rounded-lg"
        >
          <option value="all">All</option>
          <option value="creative">Creative</option>
          <option value="professional">Professional</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="border rounded-lg p-6 text-center">
            <h3 className="text-2xl font-semibold text-gray-700">
              {template.name}
            </h3>
            <div
              className="mt-2 p-4 border rounded-lg bg-gray-50"
              dangerouslySetInnerHTML={{ __html: renderPreview(template.html) }}
            />
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

export default TemplateGallery;
