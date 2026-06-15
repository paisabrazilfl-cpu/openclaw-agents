import AppLayout from "./components/layout/AppLayout";
import { SwarmProvider } from "./lib/store";

export default function App() {
  return (
    <SwarmProvider>
      <AppLayout />
    </SwarmProvider>
  );
}
