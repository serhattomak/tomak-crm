import { cn } from "@workspace/ui/lib/utils";
import type * as React from "react";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card text-card-foreground shadow-2xs transition-all dark:border-border/60",
        className
      )}
      data-slot="card"
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-4 sm:p-5", className)}
      data-slot="card-header"
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "font-semibold text-foreground text-sm leading-none tracking-tight sm:text-base",
        className
      )}
      data-slot="card-title"
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-muted-foreground text-xs leading-relaxed", className)}
      data-slot="card-description"
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("p-4 sm:p-5", className)}
      data-slot="card-content"
      {...props}
    />
  );
}

// Dikey dolgu bilinçli olarak varyantsız (`py-2`, `p-4 sm:p-5` değil): varyant taşıyan bir
// varsayılan, çağrı yerinin düz `pt-*` sınıfını o breakpoint'te yener — footer'ın `pt-2`'si
// 640px üstünde tam olarak böyle 0'a düşüyordu. Yatayda responsive kademe kalıyor, çünkü
// çağrı yerleri yatayı hiç özelleştirmiyor. Ayrıntı: globals.css kart anatomisi notu.
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center px-4 py-2 sm:px-5", className)}
      data-slot="card-footer"
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
