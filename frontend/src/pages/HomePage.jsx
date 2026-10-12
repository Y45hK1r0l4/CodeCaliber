import React from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { Code, BarChart, Award, Shield } from "lucide-react";
import { FaGithub, FaLinkedin, FaTwitter, FaEnvelope } from "react-icons/fa";

function HomePage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleStartSolving = () => {
    if (user) {
      navigate("/problems");
    } else {
      navigate("/login");
    }
  };

  const features = [
    {
      icon: <Code size={28} />,
      title: "Interactive Code Editor",
      desc: "Write and run code in real time directly in your browser.",
    },
    {
      icon: <Award size={28} />,
      title: "Gamified Learning",
      desc: "Earn points, badges, and climb the global leaderboard.",
    },
    {
      icon: <BarChart size={28} />,
      title: "Detailed Insights",
      desc: "Track your performance, accuracy, and coding streaks.",
    },
    {
      icon: <Shield size={28} />,
      title: "Secure Environment",
      desc: "Run your code safely in isolated sandboxes.",
    }
  ];

  const stats = [
    { label: "Active Users", value: "10" },
    { label: "Problems Solved", value: "25" },
    { label: "Coding Challenges", value: "10" },
    { label: "Global Reach", value: "0" },
  ];


  return (
    <div className="bg-black text-gray-300 min-h-screen">
      {/* Hero Section */}
        <section className="flex flex-col items-center justify-center text-center min-h-[80vh] px-6 bg-gray-100">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-blue-600">CodeHub</span>
          </h1>

          <p className="max-w-2xl text-gray-600 text-lg mb-8">
            Sharpen your coding skills, solve challenges, and compete with developers worldwide.
          </p>

          <button
            onClick={handleStartSolving}
            className="bg-black text-white px-6 py-2 rounded"
          >
            Start Solving
          </button>
      </section>

      {/* Features Section */}

      <section className="py-16 px-6 bg-white border-t">
        <h2 className="text-3xl font-bold text-center text-black mb-10">
          Why Choose <span className="text-blue-600">CodeHub</span>?
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((f, i) => (
            <div
              key={i}
              className="p-5 border rounded bg-gray-50"
            >
              <div className="text-blue-600 mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-black mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}

      <section className="py-12 bg-white border-t">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((stat, i) => (
            <div key={i} className="p-4 border rounded bg-gray-50">
              <h3 className="text-2xl font-bold text-blue-600">
                {stat.value}
              </h3>
              <p className="text-gray-600 text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}

      <section className="py-16 px-6 bg-gray-100 text-center border-t">
        <h2 className="text-3xl font-bold text-black mb-4">
          Ready to test your skills?
        </h2>

        <p className="text-gray-600 mb-8 max-w-xl mx-auto">
          Start solving problems, improve your coding logic, and become a better developer with CodeHub.
        </p>

        <button
          onClick={() => navigate("/problems")}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Explore Problems
        </button>
      </section>

      {/* Footer */}

      <footer className="bg-white border-t py-8 px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              
              {/* Left */}
              <div className="text-center md:text-left">
                <h2 className="text-lg font-semibold text-black">CodeHub</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Code. Learn. Innovate. © {new Date().getFullYear()}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Made by Bhavesh Tripathi & Yash Kirola
                </p>
              </div>
      
              {/* Right - Social Icons */}
              <div className="flex gap-5 text-gray-600">
                <a
                  href="https://github.com/bhaveshTripathi3112/CodeNest"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-black"
                >
                  <FaGithub size={20} />
                </a>
      
                <a
                  href="https://linkedin.com/in/bhavesh-tripathi-a69483309/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-black"
                >
                  <FaLinkedin size={20} />
                </a>
      
                <a
                  href="https://twitter.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-black"
                >
                  <FaTwitter size={20} />
                </a>
      
                <a
                  href="mailto:bhaveshtripathi3112@gmail.com"
                  className="hover:text-black"
                >
                  <FaEnvelope size={20} />
                </a>
              </div>
            </div>
      </footer>

    </div>
  );
}

export default HomePage;
