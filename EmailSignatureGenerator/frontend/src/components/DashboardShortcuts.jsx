import { Link } from "react-router-dom";

const DashboardShortcuts = () => {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <Link
        to="/create-signature"
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        Create Signature
      </Link>
      <Link
        to="/browse-templates"
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Browse Templates
      </Link>
      <Link
        to="/my-signatures"
        className="bg-purple-500 text-white px-4 py-2 rounded"
      >
        My Signatures
      </Link>
    </div>
  );
};

export default DashboardShortcuts;
