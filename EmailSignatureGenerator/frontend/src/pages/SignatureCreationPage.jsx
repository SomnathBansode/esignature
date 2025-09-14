import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ClipLoader } from "react-spinners";

const SignatureCreationPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useSelector((state) => state.user);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const templateId = new URLSearchParams(location.search).get("templateId");

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/signatures`,
        {
          template_id: templateId,
          form_data: data,
          html_code: "<p>Generated HTML here</p>", // Replace with actual HTML generation
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": crypto.randomUUID(),
          },
        }
      );
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create signature");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Signature</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Full Name"
          className={`w-full p-3 border rounded-lg ${
            errors.name ? "border-red-500" : "border-gray-300"
          }`}
          {...register("name", { required: "Name is required" })}
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
        <input
          type="text"
          placeholder="Title"
          className={`w-full p-3 border rounded-lg ${
            errors.title ? "border-red-500" : "border-gray-300"
          }`}
          {...register("title", { required: "Title is required" })}
        />
        {errors.title && (
          <p className="text-red-500 text-sm">{errors.title.message}</p>
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? <ClipLoader size={20} color="#fff" /> : "Create Signature"}
        </button>
      </form>
    </div>
  );
};

export default SignatureCreationPage;
