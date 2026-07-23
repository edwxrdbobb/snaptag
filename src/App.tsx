import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { LoginPage } from "./pages/LoginPage";
import { SubmissionsPage } from "./pages/SubmissionsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { MapPage } from "./pages/MapPage";
import { AddLocationPage } from "./pages/AddLocationPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SubmissionsPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="add" element={<AddLocationPage />} />
        </Route>
      </Routes>
      <Toaster theme="dark" position="top-center" richColors />
    </>
  );
}

export default App;
