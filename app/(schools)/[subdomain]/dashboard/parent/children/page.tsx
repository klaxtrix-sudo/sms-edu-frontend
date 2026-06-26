"use client";

import { useEffect, useState } from "react";
import { createTenantClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Users, ChevronRight, GraduationCap, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createTenantClient();

  useEffect(() => {
    const fetchChildren = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: students, error } = await supabase
          .from("students")
          .select(`
            id,
            admission_no,
            classes (name),
            profiles!students_user_id_fkey (full_name, avatar_url, email, phone)
          `)
          .eq("parent_id", session.user.id);

        if (error) throw error;
        setChildren(students || []);
      } catch (error: any) {
        toast.error(error.message || "Failed to load children");
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  if (loading) {
    return (
      <div className="py-40 flex flex-col items-center gap-4">
         <Loader2 className="size-16 animate-spin text-primary/20" />
         <p className="font-black text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading...</p>
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
        <Card className="border-none shadow-xl bg-white p-20 text-center rounded-[2rem]">
           <Users className="size-20 mx-auto text-muted-foreground opacity-20 mb-6" />
           <h3 className="text-2xl font-black text-slate-700">No children linked yet</h3>
           <p className="text-muted-foreground mt-2">Please contact the school admin to link your children.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map(child => {
            const profile = (child as any).profiles;
            const className = (child as any).classes?.name || "Unassigned";

            return (
              <Card key={child.id} className="border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden group">
                <div className="h-32 bg-primary/5 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                  <Avatar className="size-24 rounded-full border-4 border-white shadow-lg absolute -bottom-12">
                    <AvatarImage src={profile?.avatar_url} />
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
                    <Link href={`/dashboard/parent/children/\${child.id}`}>
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
