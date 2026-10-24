// src/components/AdminRoute.jsx
import React from "react";
import { Navigate } from "react-router";
import { useSelector } from "react-redux";

function AdminRoute({ children }) {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-xs gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-bold">
          &lt;/&gt;
        </div>
        <p>Verifying access privileges...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If user not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }

  if (!["admin", "evaluator"].includes(user?.role)) {
    // If logged in but not admin, redirect to homepage
    return <Navigate to="/" replace />;
  }

  return children;
}


export default AdminRoute;
