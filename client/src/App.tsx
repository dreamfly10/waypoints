import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import NotFound from "@/pages/not-found";

// Pages
import Home from "./pages/home";
import Vault from "./pages/vault";
import Readiness from "./pages/readiness";
import Advisor from "./pages/advisor";
import Community from "./pages/community";

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="w-full h-full"
      >
        <Switch location={location}>
          <Route path="/" component={Home} />
          <Route path="/vault" component={Vault} />
          <Route path="/readiness" component={Readiness} />
          <Route path="/advisor" component={Advisor} />
          <Route path="/community" component={Community} />
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
