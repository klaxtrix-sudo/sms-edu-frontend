"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message: string;
}

/**
 * Rendered when a query succeeded but returned no rows.
 * Distinct from {@link ErrorState} which renders when the query failed.
 */
export function EmptyState({ icon: Icon, title, message }: EmptyStateProps) {
  return (
    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-2xl rounded-[3rem] p-20 text-center">
      {Icon ? <Icon className="size-20 mx-auto text-muted-foreground opacity-20 mb-6" /> : null}
      <h3 className="text-2xl font-black">{title}</h3>
      <p className="text-muted-foreground mt-2 font-medium">{message}</p>
    </Card>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Rendered when a query failed. Distinct from "no data" — communicates that
 * the data could not be loaded, and offers a retry when possible.
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-2xl rounded-[3rem] p-20 text-center">
      <AlertCircle className="size-20 mx-auto text-destructive/40 mb-6" />
      <h3 className="text-2xl font-black">Couldn&rsquo;t load this</h3>
      <p className="text-muted-foreground mt-2 font-medium">
        {message || "Something went wrong while loading this data."}
      </p>
      {onRetry ? (
        <Button onClick={onRetry} variant="outline" className="mt-6 rounded-xl h-11 font-bold">
          <RefreshCw className="mr-2 size-4" /> Try again
        </Button>
      ) : null}
    </Card>
  );
}
