import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Button } from "./ui/button";
import AppointmentCard from "./AppointmentCard";
import { Calendar, Users } from "lucide-react";

const AppointmentsContent = ({ user }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/counselor/appointments`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch appointments");
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error("Error loading appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (clientId) => {
    window.location.href = `/dashboard?tab=messages&with=${clientId}`;
  };

  const handleCall = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const now = new Date();
    const appointmentDate = new Date(appointment.nextSession);

    switch (filter) {
      case "upcoming":
        return appointmentDate > now;
      case "today":
        return (
          appointmentDate.getDate() === now.getDate() &&
          appointmentDate.getMonth() === now.getMonth() &&
          appointmentDate.getFullYear() === now.getFullYear()
        );
      case "completed":
        return appointment.status === "completed";
      case "pending":
        return appointment.status === "pending_payment";
      default:
        return true;
    }
  });

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Appointments</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("upcoming")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Upcoming
          </Button>
          <Button
            variant={filter === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("today")}
          >
            Today
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            Completed
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending
          </Button>
        </div>
      </div>

      {/* Appointments Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-2 text-muted-foreground">
          <Calendar className="h-12 w-12" />
          <p>No appointments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onMessage={handleMessage}
              onCall={handleCall}
              className="h-full"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentsContent;
