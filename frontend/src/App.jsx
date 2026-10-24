import './App.css'
import { Routes, Route, Navigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { checkAuth } from "./authSlice";
import Signup from './pages/Signup';
import Login from './pages/Login';
import HomePage from './pages/HomePage';
import Navbar from './components/Navbar';
import ProblemsPage from './pages/ProblemsPage';
import ProfilePage from './pages/ProfilePage';
import SolveProblemPage from './pages/SolveProblemPage';
import AdminPanel from './pages/Adminpanel';
import AdminRoute from './components/AdminRoute';
import TrackUsersPage from './pages/TrackUsersPage';
import RegisterAdminPage from './pages/RegisterAdminPage'
import CreateProblemPage from './pages/CreateProblemPage'
import EditProblemPage from './pages/EditProblemPage'
import DeleteProblemPage from './pages/DeleteProblemPage'
import AssessmentsPage from './pages/AssessmentsPage';
import TestAttemptPage from './pages/TestAttemptPage';
import CreateTestPage from './pages/CreateTestPage';
import TestPerformancePage from './pages/TestPerformancePage';
import AssessmentHistoryPage from './pages/AssessmentHistoryPage';

function App() {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f2eee7] text-[#1c1b19]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#1c1b19] font-serif text-xl font-bold">
          A
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-black/50">Preparing your workspace</p>
      </div>
    );
  }

  return (
   <>
    <Navbar/>
    <Routes>
      
      <Route path="/" element={<HomePage />} />
      <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <HomePage />}
        />
        <Route
          path="/signup"
          element={!isAuthenticated ? <Signup /> : <HomePage />}
        />


        {/*Authenticated Routes */}
        <Route path="/admin/problems" element={<AdminRoute><ProblemsPage /></AdminRoute>} />
        <Route path="/problems" element={<Navigate to="/admin/problems" replace />} />
        <Route path="/problem/:id" element={<AdminRoute><SolveProblemPage /></AdminRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/assessments" element={<AssessmentsPage />} />
        <Route path="/test/:testId" element={<TestAttemptPage />} />
        <Route path="/admin/createTest" element={<AdminRoute><CreateTestPage /></AdminRoute>} />
        <Route path="/admin/test/:testId/performance" element={<AdminRoute><TestPerformancePage /></AdminRoute>} />
        <Route path="/admin/history" element={<AdminRoute><AssessmentHistoryPage /></AdminRoute>} />


        <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
        />

         <Route
          path="/admin/createProblem"
          element={
            <AdminRoute>
              <CreateProblemPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/editProblem"
          element={
            <AdminRoute>
              <EditProblemPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/editProblem/:id"
          element={
            <AdminRoute>
              <EditProblemPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/deleteProblem"
          element={
            <AdminRoute>
              <DeleteProblemPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/register"
          element={
            <AdminRoute>
              <RegisterAdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/trackUsers"
          element={
            <AdminRoute>
              <TrackUsersPage />
            </AdminRoute>
          }
        />
    </Routes>
    

   </>
  )
}

export default App
