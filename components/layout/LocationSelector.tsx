"use client";

import { MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

interface LocationSelectorProps {
  className?: string;
}

export function LocationSelector({ className }: LocationSelectorProps) {
  const [location, setLocation] = useState("New Delhi");
  const cities = ["New Delhi", "Mumbai", "Kolkata", "Chennai", "Gandhinagar"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={`flex items-center gap-1.5 text-sm text-foreground/80 hover:text-primary cursor-pointer transition-colors bg-muted/50 px-3 py-1.5 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
        >
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium truncate max-w-[150px] flex-1 text-left">
            {location}, India
          </span>
          <span className="text-xs text-muted-foreground">▼</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {cities.map((city) => (
          <DropdownMenuItem
            key={city}
            onClick={() => setLocation(city)}
            className={`cursor-pointer ${location === city ? "bg-primary/10 text-primary font-medium" : ""}`}
          >
            {city}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
