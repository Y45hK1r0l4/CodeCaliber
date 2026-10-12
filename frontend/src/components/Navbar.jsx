import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../authSlice";

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 border-b ${
        isScrolled ? "bg-white border-gray-300" : "bg-white border-gray-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Left - Logo */}
        <NavLink to="/" className="text-2xl font-bold text-black">
          CodeHub
        </NavLink>

        {/* Center - Links */}
        <div className="hidden md:flex space-x-6 text-sm font-medium">
          {["problems","leaderboards", "about"].map((path) => (
            <NavLink
              key={path}
              to={`/${path}`}
              className={({ isActive }) =>
                isActive
                  ? "text-blue-600"
                  : "text-gray-700 hover:text-black"
              }
            >
              {path.charAt(0).toUpperCase() + path.slice(1)}
            </NavLink>
          ))}
        </div>

        {/* Right - User Section */}
        <div className="relative flex items-center space-x-3" ref={dropdownRef}>
          {user ? (
            <>
              {/* Avatar + Name */}
              <div
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => setDropdownOpen((prev) => !prev)}
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-white font-semibold">
                  {user?.firstName?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {user?.firstName}
                </span>
              </div>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-12.5 w-44 bg-white border border-gray-300 rounded shadow-sm z-50">
                  <NavLink
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </NavLink>

                  {/* Admin Option */}
                  {user?.role === "admin" && (
                    <NavLink
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Admin Panel
                    </NavLink>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center space-x-3">
              <NavLink
                to="/login"
                className="px-4 py-2 bg-black text-white rounded text-sm"
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                className="px-4 py-2 border border-gray-400 text-gray-800 rounded text-sm"
              >
                Sign Up
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;