// frontend/src/components/Nav.jsx
import { Link } from "react-router-dom";
import { useApp } from "../contexts/AppContext";

const Nav = () => {
  const { auth, logout } = useApp();

  return (
    <nav className="p-3 border-b flex gap-4">
      <Link to="/">Home</Link>
      <Link to="/browse-templates">Browse Templates</Link>
      {auth.user ? (
        <>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/my-signatures">My Signatures</Link>
          <button onClick={logout} className="ml-auto text-red-500">
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="ml-auto">
            Login
          </Link>
          <Link to="/register" className="ml-auto">
            Register
          </Link>
        </>
      )}
    </nav>
  );
};

export default Nav;
