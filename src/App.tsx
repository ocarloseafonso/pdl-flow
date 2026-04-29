import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ClientsKanban from "./pages/ClientsKanban";
import ClientDetail from "./pages/ClientDetail";
import Agenda from "./pages/Agenda";
import Prompts from "./pages/Prompts";
import Config from "./pages/Config";
import GuiaExecucao from "./pages/GuiaExecucao";
import Briefing from "./pages/Briefing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/briefing/:token" element={<Briefing />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<ClientsKanban />} />
              <Route path="/clientes/:id" element={<ClientDetail />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/prompts" element={<Prompts />} />
              <Route path="/guia" element={<GuiaExecucao />} />
              <Route path="/config" element={<Config />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
