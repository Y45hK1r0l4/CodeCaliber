import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import { loginUser } from '../authSlice';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const loginSchema = z.object({
  emailId: z
    .string()
    .email("Enter a valid email")
    .refine(
      (val) =>
        val.endsWith("@gmail.com") || val.endsWith("@gehu.ac.in"),
      {
        message: "Email must end with @gmail.com or @gehu.ac.in",
      }
    ),
  password: z
    .string()
    .min(8, "Password should contain atleast 8 characters"),
});

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useSelector(
    (state) => state.auth
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const submittedData = (data) => {
    dispatch(loginUser(data));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white border border-gray-300 rounded p-6">
        <h1 className="text-3xl font-bold text-center mb-2">CodeHub</h1>
        <p className="text-center text-gray-600 mb-6 text-sm">
          Login to continue solving problems
        </p>

        <form onSubmit={handleSubmit(submittedData)} className="space-y-4">
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

          {/* {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )} */}

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center mt-5 text-sm">
          Don’t have an account?{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => navigate("/signup")}
          >
            Signup
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;