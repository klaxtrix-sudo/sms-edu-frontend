"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search } from "lucide-react";
import { linkStudentToParent, unlinkStudent } from "@/app/actions/parent-actions";
import { toast } from "sonner";
import { createTenantClient } from "@/lib/supabase/client";

interface LinkStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parent: any;
  schoolId: string;
  subdomain: string;
}

export function LinkStudentModal({ isOpen, onClose, onSuccess, parent, schoolId, subdomain }: LinkStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setStudents([]);
    }
  }, [isOpen]);

  const searchStudents = async () => {
    if (searchQuery.length < 3) {
      toast.error("Please enter at least 3 characters to search");
      return;
    }
    
    setIsSearching(true);
    try {
      const supabase = createTenantClient(subdomain);
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, 
          admission_no, 
          parent_id,
          profiles!students_user_id_fkey(full_name)
        `)
        .eq('school_id', schoolId)
        .ilike('profiles.full_name', `%${searchQuery}%`)
        .limit(10);
        
      if (error) throw error;
      
      // Filter out students where the profile match failed (inner join simulation)
      // and exclude students already linked to this specific parent
      const validStudents = (data || []).filter(s => 
        s.profiles && s.parent_id !== parent.id
      );
      
      setStudents(validStudents);
    } catch (err: any) {
      toast.error(err.message || "Failed to search students");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async (studentId: string) => {
    setLoading(true);
    try {
      const result = await linkStudentToParent(parent.id, studentId, subdomain);
      if (result.success) {
        toast.success("Student linked successfully");
        onSuccess();
        onClose();
      } else {
        toast.error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link Student</DialogTitle>
          <DialogDescription>
            Find a student to link to <strong>{parent?.full_name}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search student name..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchStudents()}
              />
            </div>
            <Button type="button" onClick={searchStudents} disabled={isSearching || searchQuery.length < 3}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          <div className="border rounded-md max-h-[300px] overflow-y-auto">
            {students.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                {searchQuery.length >= 3 && !isSearching ? "No available students found." : "Search to find students"}
              </div>
            ) : (
              <ul className="divide-y">
                {students.map(student => (
                  <li key={student.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-sm">{student.profiles.full_name}</p>
                      <p className="text-xs text-slate-500">Admn: {student.admission_no}</p>
                      {student.parent_id && (
                        <p className="text-[10px] text-amber-600">Currently linked to another parent</p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleLink(student.id)}
                      disabled={loading}
                    >
                      {student.parent_id ? "Transfer Link" : "Link"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
