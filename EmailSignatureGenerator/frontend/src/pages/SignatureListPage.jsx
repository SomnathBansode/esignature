import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ClipLoader } from "react-spinners";

const SignatureListPage = () => {
  const { user, token } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) navigate("/login");
    const fetchSignatures = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/signatures`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setSignatures(response.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to fetch signatures");
      } finally {
        setLoading(false);
      }
    };
    fetchSignatures();
  }, [user, token, navigate]);
  // In SignatureListPage.jsx
  if (error)
    return (
      <div className="text-center mt-20">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => fetchSignatures()}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );

  if (loading) return <div className="text-center mt-20">Loading...</div>;
  if (error)
    return <div className="text-center mt-20 text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">My Signatures</h1>
      {signatures.length === 0 ? (
        <p>No signatures found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {signatures.map((signature) => (
            <div key={signature.id} className="p-4 bg-white shadow rounded">
              <p>ID: {signature.id}</p>
              <p>Template ID: {signature.template_id}</p>
              <div dangerouslySetInnerHTML={{ __html: signature.html_code }} />
              <button
                onClick={() => navigate(`/signatures/edit/${signature.id}`)}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
              >
                Edit
              </button>
              <button
                onClick={async () => {
                  try {
                    await axios.delete(
                      `${import.meta.env.VITE_API_URL}/api/signatures/${
                        signature.id
                      }`,
                      {
                        headers: { Authorization: `Bearer ${token}` },
                      }
                    );
                    setSignatures(
                      signatures.filter((s) => s.id !== signature.id)
                    );
                  } catch (err) {
                    setError(
                      err.response?.data?.error || "Failed to delete signature"
                    );
                  }
                }}
                className="mt-2 ml-2 bg-red-600 text-white px-4 py-2 rounded"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SignatureListPage;
