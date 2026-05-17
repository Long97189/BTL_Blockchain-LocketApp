import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfileSetup from "./pages/ProfileSetup";
import Feed from "./pages/Feed";
import UploadPhoto from "./pages/UploadPhoto";
import UserProfile from "./pages/UserProfile";

function ProtectedRoute({ children }) {
  const { isBootstrapping, token } = useAuth();

  if (isBootstrapping) {
    return <div className="screen-message">Loading your session...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function SetupRoute({ children }) {
  const { isBootstrapping, token, user } = useAuth();

  if (isBootstrapping) {
    return <div className="screen-message">Preparing your profile...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.hasCompletedProfile) {
    return <Navigate to="/feed" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { isBootstrapping, token, user } = useAuth();

  if (isBootstrapping) {
    return <div className="screen-message">Checking your session...</div>;
  }

  if (token) {
    return <Navigate to={user?.hasCompletedProfile ? "/feed" : "/setup"} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/setup"
        element={
          <SetupRoute>
            <ProfileSetup />
          </SetupRoute>
        }
      />
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <UploadPhoto />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:userId"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
