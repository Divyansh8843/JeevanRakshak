import React from "react";
import { Card } from "./card";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { MessageSquare, Phone as PhoneIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ProfileCard = ({
  name,
  email,
  phone,
  ageGender,
  lastSession,
  totalSessions,
  riskLevel,
  status,
  onMessage,
  onCall,
  className,
  ...props
}) => {
  return (
    <Card
      className={cn(
        "w-full max-w-sm mx-auto overflow-hidden transition-all duration-200",
        "bg-white dark:bg-gray-800 hover:shadow-lg",
        "transform hover:scale-[1.02]",
        "sm:w-[340px] md:w-[360px]",
        className
      )}
      {...props}
    >
      <div className="flex flex-col p-4 gap-3">
        {/* Header with Avatar and Risk Level */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/10">
              {name ? name.charAt(0).toUpperCase() : "U"}
            </Avatar>
            <div>
              <h3 className="font-semibold text-base line-clamp-1">{name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {email}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "px-2 py-1 text-xs font-medium rounded-full self-center",
              riskLevel === "LOW" && "bg-green-100 text-green-700",
              riskLevel === "MEDIUM" && "bg-yellow-100 text-yellow-700",
              riskLevel === "HIGH" && "bg-red-100 text-red-700"
            )}
          >
            {riskLevel}
          </div>
        </div>

        {/* Essential Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Age/Gender:</span>
            <p className="font-medium">{ageGender || "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Sessions:</span>
            <p className="font-medium">{totalSessions || 0}</p>
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

        {/* Phone Number */}
        {phone && (
          <div className="flex items-center gap-2 text-sm">
            <PhoneIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{phone}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-1">
          {onMessage && (
            <Button
              variant="outline"
              className="flex-1 text-sm h-9"
              onClick={onMessage}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
          )}
          {onCall && phone && (
            <Button
              variant="outline"
              className="w-9 h-9 p-0 flex items-center justify-center"
              onClick={() => onCall(phone)}
            >
              <PhoneIcon className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Status Badge */}
        {status && (
          <div className="absolute top-3 right-3">
            <span
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-full",
                status === "pending_payment" && "bg-yellow-100 text-yellow-700",
                status === "confirmed" && "bg-green-100 text-green-700",
                status === "in_session" && "bg-blue-100 text-blue-700",
                status === "completed" && "bg-gray-100 text-gray-700"
              )}
            >
              {status.replace("_", " ")}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProfileCard;
