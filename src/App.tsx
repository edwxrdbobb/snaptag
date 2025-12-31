import { Toaster } from "sonner";
import { AddLocationForm } from "./components/AddLocationForm";

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AddLocationForm />
      <Toaster />
    </div>
  );
}

export default App;
