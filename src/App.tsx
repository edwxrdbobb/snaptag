import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { LoginPage } from "./pages/LoginPage";
import { InsightsPage } from "./pages/InsightsPage";
import { SubmissionsPage } from "./pages/SubmissionsPage";
import { AccuracyPage } from "./pages/AccuracyPage";
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
          <Route index element={<InsightsPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="accuracy" element={<AccuracyPage />} />
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
