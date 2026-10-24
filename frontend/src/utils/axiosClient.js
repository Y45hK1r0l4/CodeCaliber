import axios from 'axios';

// In production on Vercel, set VITE_API_URL to your Render backend URL (e.g. https://your-backend.onrender.com)
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const axiosClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});
