import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import SignatureForm from "../components/SignatureForm";

export default function EditSignature() {
  const { id } = useParams(); // Get the signature ID from the URL
  const { auth } = useApp();
  const [signatureData, setSignatureData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the signature data from the backend
  const fetchSignature = async () => {
    try {
      const response = await api(`/signatures/${id}`, {
        method: "GET",
        token: auth.token, // Ensure token is passed here correctly
      });
      setSignatureData(response); // Set signature data
    } catch (e) {
      console.error("Error fetching signature:", e);
      setError("Failed to fetch signature data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignature(); // Fetch the signature when the component is mounted
  }, [id, auth.token]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-6">Edit Signature</h2>
      {signatureData && (
        <SignatureForm value={signatureData} onChange={setSignatureData} />
      )}
    </div>
  );
}
