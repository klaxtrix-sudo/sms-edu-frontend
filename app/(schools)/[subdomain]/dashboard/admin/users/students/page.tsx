"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTenant } from "@/components/providers/tenant-provider";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  GraduationCap,
  Loader2,
  Key
} from "lucide-react";
import { AddStudentModal } from "@/components/admin/add-student-modal";
import { resetStudentPassword } from "@/app/actions/admin-actions";
import { toast } from "sonner";

export default function StudentsPage() {
  const { subdomain } = useParams();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  
  // Password Reset State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string, name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const studentsPerPage = 20;
  
  const { supabase, isLoading: isTenantLoading } = useTenant();

  const fetchData = async () => {
    if (!supabase) return;
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
        
        // Fetch classes
        const { data: classesData } = await supabase
          .from("classes")
          .select("id, name")
          .eq("school_id", profile.school_id)
          .order("name");
        setClasses(classesData || []);

        // Fetch students with their profile and class info
        const { data, error } = await (supabase as any)
          .from("students")
          .select(`
            id,
            user_id,
            admission_no,
            gender,
            profiles!user_id (
              full_name,
              phone
            ),
            classes!class_id (
              id,
              name
            )
          `)
          .eq("school_id", profile.school_id)
          .order("admission_no");

        if (error) throw error;
        setStudents(data || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supabase) fetchData();
  }, [supabase]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClassId]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setResetting(true);
    try {
      const result = await resetStudentPassword(
        selectedStudent.id,
        newPassword,
        subdomain as string
      );
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Password updated successfully for ${selectedStudent.name}`);
        setIsResetPasswordOpen(false);
        setNewPassword("");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admission_no.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesClass = selectedClassId === "all" || 
      s.classes?.id === selectedClassId || 
      (selectedClassId === "unassigned" && !s.classes);
      
    return matchesSearch && matchesClass;
  });

  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1">Manage the student body and enrollment details.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Enroll Student
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search students..." 
              className="pl-9 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:max-w-xs">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isTenantLoading || loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading student directory...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No students found.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-accent/50 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold">
                        {student.admission_no}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold text-xs border border-emerald-500/20">
                            <GraduationCap className="size-4" />
                          </div>
                          {student.profiles?.full_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {student.classes?.name || "Unassigned"}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize text-sm text-muted-foreground">
                        {student.gender || "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedStudent({ id: student.user_id, name: student.profiles?.full_name || "Student" });
                                setIsResetPasswordOpen(true);
                              }}
                              className="text-cyan-500 hover:text-cyan-600 focus:text-cyan-600 font-semibold cursor-pointer"
                            >
                              Reset Password
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                  <div className="text-xs text-muted-foreground font-medium">
                    Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, filteredStudents.length)} of {filteredStudents.length} students
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-8 rounded-lg"
                    >
                      Previous
                    </Button>
                    <div className="text-xs font-semibold px-2">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="h-8 rounded-lg"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {schoolId && (
        <AddStudentModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={fetchData}
          schoolId={schoolId}
          subdomain={subdomain as string}
        />
      )}

      {/* Change Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-500" />
                Change Student Password
              </DialogTitle>
              <DialogDescription>
                Assign a new login password for {selectedStudent?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <p className="text-[10px] text-muted-foreground">Password must be at least 6 characters long.</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsResetPasswordOpen(false)} disabled={resetting}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
