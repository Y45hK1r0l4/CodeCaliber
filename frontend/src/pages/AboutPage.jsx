import React from "react";
import {
  SiMongodb,
  SiExpress,
  SiReact,
  SiNodedotjs,
  SiDocker,
} from "react-icons/si";
import { FaCode, FaBrain, FaRocket } from "react-icons/fa";

function AboutPage() {
  const techIcons = [
    { icon: <SiMongodb size={36} />, label: "MongoDB" },
    { icon: <SiExpress size={36} />, label: "Express.js" },
    { icon: <SiReact size={36} />, label: "React.js" },
    { icon: <SiNodedotjs size={36} />, label: "Node.js" },
    { icon: <SiDocker size={36} />, label: "Docker" },
  ];

  const features = [
    {
      icon: <FaCode className="text-blue-600" size={24} />,
      title: "Multi-Language Code Execution",
      desc: "Supports over 3 programming languages with real-time output powered by the local Codebox execution service.",
    },
    {
      icon: <FaBrain className="text-purple-600" size={24} />,
      title: "Smart Submission Tracking",
      desc: "Uses compound indexing in MongoDB for instant access to per-user and per-problem submission history.",
    },
    {
      icon: <FaRocket className="text-green-600" size={24} />,
      title: "Optimized Performance",
      desc: "API architecture designed for 35% faster responses and scalable backend throughput.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-5xl mx-auto text-center">
        
        {/* Header */}
        <h1 className="text-4xl font-bold mb-4 text-black">
          About Ascend
        </h1>

        <p className="text-gray-600 text-base max-w-2xl mx-auto mb-10">
          Ascend is a full-stack online coding platform that empowers users to
          write, compile, and execute code in real-time — directly in their
          browser. Designed with performance and scalability in mind, Ascend
          ensures a smooth and powerful problem-solving experience for
          developers worldwide.
        </p>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white border rounded p-5 text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                {f.icon}
                <h3 className="text-lg font-semibold text-black">
                  {f.title}
                </h3>
              </div>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Tech Stack */}
        <div className="mt-14">
          <h2 className="text-2xl font-bold mb-6 text-black">
            Powered by Modern Technologies
          </h2>

          <div className="flex flex-wrap justify-center gap-8">
            {techIcons.map((t, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 text-gray-700"
              >
                {t.icon}
                <span className="text-sm">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-14 text-sm text-gray-600">
          <p>
            Designed & Developed by{" "}
            <span className="font-semibold text-black">Bhavesh Tripathi & Yash Kirola</span>{" "}
            | Built  using MERN Stack
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;