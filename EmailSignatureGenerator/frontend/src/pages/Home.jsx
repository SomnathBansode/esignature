import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 p-4">
      <h1 className="text-4xl font-bold mb-4">Email Signature Generator</h1>
      <p className="text-lg mb-6">Create professional signatures easily!</p>
      {/* Use the Link component for navigation */}
      <Link
        to="/browse-templates"
        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
      >
        Browse Templates
      </Link>
    </div>
  );
};

export default Home;
