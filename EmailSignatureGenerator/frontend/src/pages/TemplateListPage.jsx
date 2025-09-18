import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTemplates } from "../redux/slices/templateSlice";
import TemplateGallery from "../components/TemplateGallery";
const TemplateListPage = () => {
  const dispatch = useDispatch();
  const { templates, loading, error } = useSelector((state) => state.template);

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  if (loading)
    return <div className="text-center mt-20">Loading templates...</div>;
  if (error)
    return <div className="text-center mt-20 text-red-500">{error}</div>;

  return <TemplateGallery templates={templates} />;
};

export default TemplateListPage;
