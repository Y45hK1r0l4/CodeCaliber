// src/components/AdminRoute.jsx
import React from "react";
import { Navigate } from "react-router";
import { useSelector } from "react-redux";

function AdminRoute({ children }) {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <span className="loading loading-spinner loading-lg text-indigo-600"></span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If user not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    // If logged in but not admin, redirect to homepage
    return <Navigate to="/" replace />;
  }

  return children;
}


export default AdminRoute;
