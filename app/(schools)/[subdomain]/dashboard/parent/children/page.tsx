"use client";

import { Users, ChevronRight } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParentChildren } from "@/hooks/use-parent-children";
import { EmptyState, ErrorState } from "@/components/dashboard/query-states";

export default function ParentChildrenPage() {
  const { children, loading, error, refetch } = useParentChildren();

  if (loading) {
    return (
      <div className="py-40 flex flex-col items-center gap-4">
         <Loader2 className="size-16 animate-spin text-primary/20" />
         <p className="font-black text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">My Children</h1>
          <p className="text-slate-500 mt-2 font-medium">Detailed profiles of your enrolled children.</p>
        </div>
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">My Children</h1>
        <p className="text-slate-500 mt-2 font-medium">Detailed profiles of your enrolled children.</p>
      </div>

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No children linked yet"
          message="Please contact the school admin to link your children."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map(child => {
            const profile = child.profiles;
            const className = child.classes?.name || "Unassigned";

            return (
              <Card key={child.id} className="border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden group">
                <div className="h-32 bg-primary/5 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                  <Avatar className="size-24 rounded-full border-4 border-white shadow-lg absolute -bottom-12">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-3xl">
                      {profile?.full_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardContent className="pt-16 pb-8 px-8 text-center space-y-4">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-2">{profile?.full_name}</h3>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-widest text-[10px]">
                      {className}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-slate-500 font-medium pb-4">
                    <span>Admission: {child.admission_no}</span>
                  </div>
                  <Button asChild className="w-full rounded-xl h-12 font-bold group-hover:bg-primary transition-colors">
                    <Link href={`/dashboard/parent/children/${child.id}`}>
                      View Full Details <ChevronRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
