import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas"; // Import html2canvas

export default function MySignatures() {
  const navigate = useNavigate();
  const [signatures, setSignatures] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSignatures, setTotalSignatures] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingSignatureId, setDeletingSignatureId] = useState(null); // Track ID of signature being deleted

  const fetchSignatures = async (page) => {
    try {
      setLoading(true);
      const response = await api(`/signatures?page=${page}&limit=10`);
      setSignatures(response);
      setTotalSignatures(response.length);
    } catch (error) {
      console.error("Error fetching signatures", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignatures(currentPage);
  }, [currentPage]);

  // Handle the delete logic (without re-fetching the list)
  const handleDelete = (signatureId) => {
    setDeletingSignatureId(signatureId); // Set the signature ID for confirmation modal
  };

  const confirmDelete = async () => {
    try {
      // Call delete API
      await api(`/signatures/${deletingSignatureId}`, {
        method: "DELETE",
      });

      // Instead of re-fetching, directly remove the deleted signature from state
      setSignatures((prevSignatures) =>
        prevSignatures.filter((sig) => sig.id !== deletingSignatureId)
      );
      setDeletingSignatureId(null); // Reset after deletion
    } catch (error) {
      console.error("Error deleting signature", error);
    }
  };

  const cancelDelete = () => {
    setDeletingSignatureId(null); // Cancel delete and reset state
  };

  const handleEdit = (signatureId) => {
    // Check if user is logged in, else redirect to login page
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login"); // Redirect to login if not authenticated
    } else {
      navigate(`/edit-signature/${signatureId}`); // Redirect to edit page if logged in
    }
  };

  // Handle copying the signature as an image (capturing the real signature)
  const handleCopy = async (signatureId) => {
    // Find the element containing the signature HTML
    const signatureElement = document.getElementById(
      `signature-${signatureId}`
    );

    try {
      // Use html2canvas to capture the signature as an image (canvas)
      const canvas = await html2canvas(signatureElement, {
        // Options to exclude the buttons when rendering the canvas
        ignoreElements: (el) => el.tagName === "BUTTON" || el.tagName === "A", // Exclude buttons and links
      });

      // Convert the canvas to a data URL (image)
      const imgData = canvas.toDataURL("image/png");

      // Create a Blob from the image data
      const blob = await fetch(imgData).then((res) => res.blob());

      // Create a clipboard item with the image data
      const item = new ClipboardItem({ "image/png": blob });

      // Write the image to the clipboard
      await navigator.clipboard.write([item]);
      alert(
        "Signature copied to clipboard! You can now paste it into your email."
      );
    } catch (error) {
      console.error("Error copying signature", error);
      alert("Failed to copy the signature. Please try again.");
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchSignatures(page); // Fetch new page
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl mb-6">My Signatures</h2>
      {signatures.length === 0 ? (
        <p>No signatures found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {signatures.map((signature) => (
            <div
              key={signature.id}
              id={`signature-${signature.id}`} // Unique ID for the signature element
              className="card p-4 border rounded-lg shadow-lg"
            >
              {/* Render the signature */}
              <div dangerouslySetInnerHTML={{ __html: signature.html_code }} />
              <div className="mt-2 flex justify-between">
                <button
                  onClick={() => handleEdit(signature.id)}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(signature.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleCopy(signature.id)} // Copy the real signature as an image
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSignatureId && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
            <h3 className="text-xl mb-4">
              Are you sure you want to delete this signature?
            </h3>
            <div className="flex gap-4">
              <button
                onClick={confirmDelete}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Yes, Delete
              </button>
              <button
                onClick={cancelDelete}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex justify-center gap-2 mt-6">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Previous
        </button>
        <span className="px-4 py-2">{currentPage}</span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
