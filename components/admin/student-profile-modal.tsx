"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  User,
  GraduationCap,
  Calendar,
  Heart,
  MapPin,
  Users,
  AlertCircle,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { createTenantClient } from "@/lib/supabase/client";

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
}

export function StudentProfileModal({
  isOpen,
  onClose,
  student,
}: StudentProfileModalProps) {
  const [linkedParents, setLinkedParents] = useState<any[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const supabase = createTenantClient();

  useEffect(() => {
    if (isOpen && student?.id) {
      const fetchParents = async () => {
        setLoadingParents(true);
        try {
          const { data } = await supabase
            .from("parent_student_links")
            .select(`
              id,
              relationship,
              is_primary,
              parent:parent_id (
                id,
                full_name,
                email,
                phone
              )
            `)
            .eq("student_id", student.id);

          setLinkedParents(data || []);
        } catch (err) {
          console.error("Failed to load linked parents:", err);
        } finally {
          setLoadingParents(false);
        }
      };

      fetchParents();
    } else {
      setLinkedParents([]);
    }
  }, [isOpen, student?.id]);

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border border-border/80 shadow-2xl bg-card text-card-foreground">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border-b border-border/80">
          <DialogHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground font-bold px-3 py-1 uppercase tracking-tight">
                Student Profile
              </Badge>
              <Badge variant="outline" className="font-bold uppercase tracking-tight text-foreground border-border">
                {student.admission_no || "N/A"}
              </Badge>
              {student.classes?.name && (
                <Badge variant="secondary" className="font-bold text-foreground">
                  {student.classes.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 pt-1">
              {student.profiles?.avatar_url ? (
                <img
                  src={student.profiles.avatar_url}
                  alt={student.profiles?.full_name || "Student"}
                  className="size-16 rounded-2xl object-cover border-2 border-border shadow-md shrink-0"
                />
              ) : (
                <div className="size-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-2xl shrink-0">
                  {(student.profiles?.full_name || "S").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="space-y-1">
                <DialogTitle className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                  {student.profiles?.full_name || "Student Name"}
                </DialogTitle>
                <DialogDescription className="font-medium text-muted-foreground">
                  Complete academic, demographic, and medical record overview.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Grid Layout for Bio & Demographics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bio & Academic Info */}
            <div className="bg-muted/40 p-5 rounded-2xl border border-border/80 space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-base border-b border-border pb-3">
                <User className="size-5" />
                <span>Personal Details</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Gender</span>
                  <span className="font-bold text-foreground capitalize">
                    {student.gender || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Date of Birth</span>
                  <span className="font-bold text-foreground">
                    {student.date_of_birth
                      ? new Date(student.date_of_birth).toLocaleDateString()
                      : "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Admission No</span>
                  <span className="font-bold text-foreground">
                    {student.admission_no || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Assigned Class</span>
                  <span className="font-bold text-foreground">
                    {student.classes?.name || "Unassigned"}
                  </span>
                </div>
                {student.previous_school && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Previous School</span>
                    <span className="font-bold text-foreground">
                      {student.previous_school}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Demographics & Contact */}
            <div className="bg-muted/40 p-5 rounded-2xl border border-border/80 space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-base border-b border-border pb-3">
                <MapPin className="size-5" />
                <span>Origin &amp; Address</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">State of Origin</span>
                  <span className="font-bold text-foreground">
                    {student.state_of_origin || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">LGA</span>
                  <span className="font-bold text-foreground">
                    {student.lga || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Religion</span>
                  <span className="font-bold text-foreground">
                    {student.religion || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block mb-1">
                    Residential Address
                  </span>
                  <span className="font-bold text-foreground block">
                    {student.residential_address || "Not specified"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Profile Card */}
          <div className="bg-rose-500/10 p-5 rounded-2xl border border-rose-500/20 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base border-b border-rose-500/20 pb-3">
              <Heart className="size-5" />
              <span>Medical Profile</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400 block">
                  Blood Group
                </span>
                <span className="text-lg font-black text-rose-700 dark:text-rose-300">
                  {student.blood_group || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400 block">
                  Genotype
                </span>
                <span className="text-lg font-black text-rose-700 dark:text-rose-300">
                  {student.genotype || "N/A"}
                </span>
              </div>
              <div className="sm:col-span-1">
                <span className="text-xs uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400 block">
                  Conditions / Allergies
                </span>
                <span className="font-bold text-rose-700 dark:text-rose-300">
                  {student.medical_conditions || "None recorded"}
                </span>
              </div>
            </div>
          </div>

          {/* Linked Parents Card */}
          <div className="bg-muted/40 p-5 rounded-2xl border border-border/80 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-base border-b border-border pb-3">
              <Users className="size-5" />
              <span>Linked Parents / Guardians</span>
            </div>
            {loadingParents ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : linkedParents.length === 0 ? (
              <p className="text-sm text-muted-foreground font-medium">
                No parents or guardians currently linked to this student.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {linkedParents.map((link) => (
                  <div
                    key={link.id}
                    className="p-3 bg-card rounded-xl border border-border/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">
                        {link.parent?.full_name || "Guardian"}
                      </span>
                      <Badge variant="outline" className="text-xs uppercase font-bold border-border">
                        {link.relationship || "Parent"}
                      </Badge>
                    </div>
                    {link.parent?.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Mail className="size-3.5 shrink-0" />
                        <span className="truncate">{link.parent.email}</span>
                      </div>
                    )}
                    {link.parent?.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Phone className="size-3.5 shrink-0" />
                        <span>{link.parent.phone}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
