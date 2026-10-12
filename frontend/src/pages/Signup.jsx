import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { registerUser } from "../authSlice";
import Toast from "../components/Toaster";

const signupSchema = z.object({
  firstName: z.string().min(3, "Name should contain at least 3 characters"),
  emailId: z
    .string()
    .email("Enter a valid email")
    .refine(
      (val) => val.endsWith("@gmail.com") || val.endsWith("@gehu.ac.in"),
      { message: "Email must end with @gmail.com or @gehu.ac.in" }
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least 1 special character"),
});

function Signup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);
  const [toast, setToast] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signupSchema) });

  useEffect(() => {
    if (isAuthenticated) {
      setToast({
        type: "success",
        message: "Registration successful! Redirecting...",
      });

      const timer = setTimeout(() => {
        setToast(null);
        navigate("/");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      setToast({
        type: "error",
        message:
          typeof error === "string"
            ? error
            : error.message || "Registration failed! Please try again.",
      });

      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const submittedData = (data) => {
    dispatch(registerUser(data));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-full max-w-md bg-white border border-gray-300 rounded p-6">
        <h1 className="text-3xl font-bold text-center mb-2">CodeHub</h1>
        <p className="text-center text-gray-600 mb-6 text-sm">
          Create your account to start coding
        </p>

        <form onSubmit={handleSubmit(submittedData)} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Name</label>
            <input
              {...register("firstName")}
              type="text"
              placeholder="Enter your name"
              className="w-full border border-gray-400 px-3 py-2 rounded outline-none"
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              {...register("emailId")}
              type="email"
              placeholder="Enter your email"
              className="w-full border border-gray-400 px-3 py-2 rounded outline-none"
            />
            {errors.emailId && (
              <p className="text-red-500 text-sm mt-1">
                {errors.emailId.message}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              {...register("password")}
              type="password"
              placeholder="Enter your password"
              className="w-full border border-gray-400 px-3 py-2 rounded outline-none"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded"
            disabled={loading}
          >
            {loading ? "Signing up..." : "Signup"}
          </button>
        </form>

        <p className="text-center mt-5 text-sm">
          Already have an account?{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

export default Signup;