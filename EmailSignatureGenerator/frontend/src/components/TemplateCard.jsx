import React from "react";

const TemplateCard = ({ item, onUse }) => {
  return (
    <div className="border rounded-lg p-3 hover:shadow-sm transition">
      <img
        src={item.thumbnail || "default-thumbnail.png"} // Fallback image if no thumbnail is available
        alt={item.name}
        className="w-full h-28 object-cover rounded"
      />
      <div className="mt-2 text-sm font-medium">{item.name}</div>
      <button
        onClick={() => onUse(item)} // Trigger the use template function
        className="mt-2 text-xs px-2 py-1 rounded border"
      >
        Use Template
      </button>
    </div>
  );
};

export default TemplateCard;
