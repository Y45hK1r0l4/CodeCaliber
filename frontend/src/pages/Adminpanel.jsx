import React from "react";
import { useNavigate } from "react-router";

function AdminPanel() {
  const navigate = useNavigate();

  const features = [
    {
      title: "Create Problem",
      description: "Add new coding challenges for users to solve manually or via Gemini Copilot.",
      onClick: () => navigate("/admin/createProblem"),
      button: "Create",
    },
    {
      title: "Edit Problem",
      description: "Update test cases, descriptions, boilerplate code, or solutions.",
      onClick: () => navigate("/admin/editProblem"),
      button: "Edit",
    },
    {
      title: "Delete Problem",
      description: "Remove outdated or duplicate problems from the system.",
      onClick: () => navigate("/admin/deleteProblem"),
      button: "Delete",
    },
    {
      title: "Register Admin",
      description: "Add a new admin user with special permissions.",
      onClick: () => navigate("/admin/register"),
      button: "Register",
    },
    {
      title: "Show Users",
      description: "Track the performance of users.",
      onClick: () => navigate("/admin/trackUsers"),
      button: "Show Users",
    },
  ];

  return (
    <section className="min-h-screen bg-gray-100 px-6 py-10">
      
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 text-sm">
          Manage coding problems, users, and platform settings.
        </p>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white border rounded p-5"
          >
            <h2 className="text-lg font-semibold text-black mb-2">
              {feature.title}
            </h2>

            <p className="text-gray-600 text-sm mb-4">
              {feature.description}
            </p>

            <button
              onClick={feature.onClick}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {feature.button}
            </button>
          </div>
        ))}
      </div>

    </section>
  );
}

export default AdminPanel;