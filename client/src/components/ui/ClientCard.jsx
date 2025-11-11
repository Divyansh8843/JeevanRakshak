import React from "react";
import { Card } from "./card";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { MessageSquare, Phone as PhoneIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ClientCard = ({ client, onMessage, className, ...props }) => {
  const {
    name,
    email,
    phone,
    age,
    totalSessions = 0,
    lastSession,
    riskLevel = "LOW",
  } = client;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200",
        "hover:shadow-lg dark:hover:shadow-primary/5",
        "transform hover:scale-[1.02]",
        className
      )}
      {...props}
    >
      <div className="p-4 flex flex-col gap-3">
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

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-y-1 text-sm">
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
        </div>

        {/* Contact Info */}
        {phone && (
          <div className="flex items-center gap-2 text-sm mt-1">
            <PhoneIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{phone}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          {onMessage && (
            <Button
              variant="outline"
              className="w-full h-9 text-sm"
              onClick={() => onMessage(client.id)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ClientCard;
