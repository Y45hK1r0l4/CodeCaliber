import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import Toast from "../components/Toaster";
import { axiosClient } from "../utils/axiosClient";

// validation schema
const adminRegisterSchema = z.object({
  firstName: z.string().min(3, "First name must be at least 3 characters"),
  lastName: z.string().min(3, "Last name must be at least 3 characters"),
  emailId: z
    .string()
    .email("Enter a valid email")
    .refine(
      (val) => val.endsWith("@gmail.com") || val.endsWith("@gehu.ac.in"),
      {
        message: "Email must end with @gmail.com or @gehu.ac.in",
      }
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function AdminRegister() {
  const navigate = useNavigate();
  const [toastData, setToastData] = useState({ message: "", type: "" });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(adminRegisterSchema),
  });

const onSubmit = async (data) => {
  try {
    const adminData = { ...data, role: "admin" };

    const res = await axiosClient.post(
      "/user/admin/register",
      adminData,
      { withCredentials: true }
    );

    // ✅ FIXED CONDITION
    if (res.status === 201) {
      setToastData({
        message: "Admin registered successfully!",
        type: "success",
      });

      reset();

      setTimeout(() => {
        navigate("/admin");
      }, 1500);
    } else {
      setToastData({
        message: res.data?.message || "Registration failed",
        type: "error",
      });
    }
  } catch (error) {
    setToastData({
      message: error.response?.data?.message || "Something went wrong",
      type: "error",
    });
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      
      {toastData.message && (
        <Toast
          message={toastData.message}
          type={toastData.type}
          onClose={() => setToastData({ message: "", type: "" })}
        />
      )}

      <div className="w-full max-w-md bg-white border p-6 rounded">
        <h2 className="text-2xl font-bold text-center mb-6">
          Admin Registration
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <div>
            <input
              {...register("firstName")}
              type="text"
              placeholder="First Name"
              className="w-full border px-3 py-2 rounded"
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div>
            <input
              {...register("lastName")}
              type="text"
              placeholder="Last Name"
              className="w-full border px-3 py-2 rounded"
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">
                {errors.lastName.message}
              </p>
            )}
          </div>

          <div>
            <input
              {...register("emailId")}
              type="email"
              placeholder="Email"
              className="w-full border px-3 py-2 rounded"
            />
            {errors.emailId && (
              <p className="text-red-500 text-sm mt-1">
                {errors.emailId.message}
              </p>
            )}
          </div>

          <div>
            <input
              {...register("password")}
              type="password"
              placeholder="Password"
              className="w-full border px-3 py-2 rounded"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registering..." : "Register Admin"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/admin")}
            className="text-sm text-blue-600"
          >
            Back to Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminRegister;