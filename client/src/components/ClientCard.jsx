import React from "react";
import { Card } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  MessageSquare,
  Phone as PhoneIcon,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ClientCard = ({ client, onMessage, onSchedule, className, ...props }) => {
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
  } = client;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200",
        "bg-white dark:bg-gray-800",
        "border border-gray-200 dark:border-gray-700",
        "hover:shadow-md dark:hover:shadow-primary/5",
        "transform hover:scale-[1.01]",
        className
      )}
      {...props}
    >
      <div className="p-4 flex flex-col gap-3 relative">
        {/* Status Badge (if exists) */}
        {status && (
          <div className="absolute top-3 right-3">
            <span
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-full",
                status === "pending_payment" &&
                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                status === "confirmed" &&
                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                status === "in_session" &&
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                status === "completed" &&
                  "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
              )}
            >
              {status.replace("_", " ")}
            </span>
          </div>
        )}

        {/* Header with Avatar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/10">
              {name ? name.charAt(0).toUpperCase() : "U"}
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">{name}</h3>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>

          {/* Risk Level Badge */}
          <div
            className={cn(
              "px-2 py-1 text-xs font-medium rounded-full shrink-0",
              riskLevel === "LOW" &&
                "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              riskLevel === "MEDIUM" &&
                "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
              riskLevel === "HIGH" &&
                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {riskLevel}
          </div>
        </div>

        {/* Essential Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {age && (
            <div>
              <span className="text-xs text-muted-foreground">Age:</span>
              <p className="font-medium">{age} yrs</p>
            </div>
          )}
          <div>
            <span className="text-xs text-muted-foreground">Sessions:</span>
            <p className="font-medium">{totalSessions}</p>
          </div>
          {lastSession && (
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">
                Last Session:
              </span>
              <p className="font-medium">{lastSession}</p>
            </div>
          )}
          {nextSession && (
            <div className="col-span-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">{nextSession}</p>
            </div>
          )}
        </div>

        {/* Contact Info */}
        {phone && (
          <div className="flex items-center gap-2 text-sm">
            <PhoneIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{phone}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          {onMessage && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => onMessage(id)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
          )}
          {onSchedule && status === "pending_payment" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => onSchedule(id)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          )}
        </div>

        {/* Alert for High Risk */}
        {riskLevel === "HIGH" && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>Requires immediate attention</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ClientCard;
