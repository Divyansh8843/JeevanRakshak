import ClientCard from "../components/ClientCard";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Button } from "../components/ui/button";
import { Users } from "lucide-react";

const ClientsContent = ({ user }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/counselor/clients`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch clients");
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (clientId) => {
    // Navigate to messages tab with the client selected
    window.location.href = `/dashboard?tab=messages&with=${clientId}`;
  };

  const handleSchedule = async (clientId) => {
    try {
      // Implement your scheduling logic here
      toast.success("Session scheduled successfully");
      await loadClients(); // Refresh the clients list
    } catch (error) {
      console.error("Error scheduling session:", error);
      toast.error("Failed to schedule session");
    }
  };

  const filteredClients = clients.filter((client) => {
    if (filter === "all") return true;
    if (filter === "active") return client.totalSessions > 0;
    if (filter === "new") return client.totalSessions === 0;
    if (filter === "high_risk") return client.riskLevel === "HIGH";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">
          Clients ({filteredClients.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
          >
            Active
          </Button>
          <Button
            variant={filter === "new" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("new")}
          >
            New
          </Button>
          <Button
            variant={filter === "high_risk" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("high_risk")}
          >
            High Risk
          </Button>
        </div>
      </div>

      {/* Client Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-2 text-muted-foreground">
          <Users className="h-12 w-12" />
          <p>No clients found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onMessage={handleMessage}
              onSchedule={handleSchedule}
              className="h-full"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientsContent;
