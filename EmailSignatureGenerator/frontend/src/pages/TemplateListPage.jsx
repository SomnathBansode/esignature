// src/pages/TemplateListPage.jsx
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTemplates } from "@/redux/slices/templateSlice";
import TemplateGallery from "@/components/TemplateGallery";

const TemplateListPage = () => {
  const dispatch = useDispatch();
  const { templates, loading, error } = useSelector((s) => s.template);

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="flex flex-col items-center gap-3 text-slate-700">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-sm sm:text-base">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-4 sm:p-6 text-red-700">
          <h2 className="text-base sm:text-lg font-bold mb-1">
            Couldn’t load templates
          </h2>
          <p className="text-sm sm:text-base mb-3 break-words">{error}</p>
          <button
            onClick={() => dispatch(fetchTemplates())}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 w-full sm:w-auto"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Templates
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-1">
              Pick a template to start crafting your signature.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3 py-1.5 sm:px-4 sm:py-2 shadow-sm">
            <span className="text-xs sm:text-sm font-semibold text-slate-700">
              {templates?.length || 0} items
            </span>
          </div>
        </div>
      </header>

      {/* Responsive gallery container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
        {/* TemplateGallery handles its own layout; container ensures good spacing on all screens */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur p-3 sm:p-5">
          <TemplateGallery templates={templates} />
        </div>
      </main>
    </div>
  );
};

export default TemplateListPage;
