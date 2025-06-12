import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
// import Home from "@/pages/Home"; // Home will be replaced by LeadScraper as the default
import WebsiteLookup from "@/pages/WebsiteLookup";
import LeadScraper from "@/pages/LeadScraper";
import TestFunction from "@/pages/TestFunction";
import { Header } from "@/components/Header"; // Import Header

function Router() {
  return (
    <Switch>
      <Route path="/website-lookup" component={WebsiteLookup} />
      <Route path="/lead-scraper" component={LeadScraper} />
      <Route path="/test-function" component={TestFunction} />
      <Route path="/">
        <Redirect to="/lead-scraper" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Header /> {/* Add Header here */}
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
