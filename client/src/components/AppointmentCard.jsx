import React from "react";
import { Card } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  MessageSquare,
  Calendar,
  AlertCircle,
  PhoneCall,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AppointmentCard = ({
  appointment,
  onMessage,
  onSchedule,
  onCall,
  className,
}) => {
  const {
    id,
    name,
    email,
    phone,
    age,
    totalSessions = 0,
    lastSession,
    nextSession,
    riskLevel = "LOW",
    status,
  } = appointment;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200",
        "bg-white dark:bg-gray-800/90",
        "hover:shadow-lg dark:hover:shadow-primary/5",
        "border border-gray-200 dark:border-gray-700",
        className
      )}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Client Info Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/10">
              {name?.charAt(0).toUpperCase() || "C"}
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">{name}</h3>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>

          {/* Risk Level Indicator */}
          {riskLevel && (
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                riskLevel === "LOW" &&
                  "bg-green-100 text-green-700 dark:bg-green-900/30",
                riskLevel === "MEDIUM" &&
                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30",
                riskLevel === "HIGH" &&
                  "bg-red-100 text-red-700 dark:bg-red-900/30"
              )}
            >
              {riskLevel}
            </span>
          )}
        </div>

        {/* Session Info */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <div>
            <span className="text-xs text-muted-foreground">Sessions</span>
            <p className="text-sm font-medium">{totalSessions}</p>
          </div>
          {age && (
            <div>
              <span className="text-xs text-muted-foreground">Age</span>
              <p className="text-sm font-medium">{age} yrs</p>
            </div>
          )}
        </div>

        {/* Appointment Timing */}
        {nextSession && (
          <div className="flex items-center gap-2 text-primary/90">
            <Calendar className="h-4 w-4" />
            <p className="text-sm font-medium">{formatDate(nextSession)}</p>
          </div>
        )}

        {/* Status Badge */}
        {status && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span
              className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                status === "pending_payment" && "bg-yellow-100 text-yellow-700",
                status === "confirmed" && "bg-green-100 text-green-700",
                status === "in_session" && "bg-blue-100 text-blue-700",
                status === "completed" && "bg-gray-100 text-gray-700"
              )}
            >
              {status.replace(/_/g, " ")}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onMessage?.(id)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
          {phone && onCall && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCall(phone)}
              className="px-3"
            >
              <PhoneCall className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* High Risk Alert */}
        {riskLevel === "HIGH" && (
          <div className="flex items-center gap-2 text-red-500 text-xs mt-1">
            <AlertCircle className="h-4 w-4" />
            <span>Requires immediate attention</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AppointmentCard;
