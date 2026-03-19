"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Phone,
  Loader2
} from "lucide-react";
import { AddTeacherModal } from "@/components/admin/add-teacher-modal";
import { toast } from "sonner";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchTeachers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single() as any;

      if (profile?.school_id) {
        setSchoolId(profile.school_id as string);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("school_id", profile.school_id as string)
          .eq("role", "teacher")
          .order("full_name");

        if (error) throw error;
        setTeachers(data || []);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teachers list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const filteredTeachers = teachers.filter(t => 
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground mt-1">Manage teaching staff and access levels.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or phone..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading teacher directory...</p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No teachers found.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id} className="hover:bg-accent/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {teacher.full_name.charAt(0)}
                          </div>
                          {teacher.full_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {/* Note: email is in auth.users, not profiles in our schema, 
                              but we can add it to profiles or fetch it. 
                              For now, showing phone. */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="size-3" />
                            {teacher.phone || "No phone"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(teacher.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {schoolId && (
        <AddTeacherModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={fetchTeachers}
          schoolId={schoolId}
        />
      )}
    </div>
  );
}
