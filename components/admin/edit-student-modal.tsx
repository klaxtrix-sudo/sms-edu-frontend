"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit3, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { updateStudent, uploadStudentPassport } from "@/app/actions/admin-actions";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT",
];

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  classes: { id: string; name: string }[];
  subdomain: string;
  schoolId: string;
  onSuccess: () => void;
}

export function EditStudentModal({
  isOpen,
  onClose,
  student,
  classes,
  subdomain,
  schoolId,
  onSuccess,
}: EditStudentModalProps) {
  const [fullName, setFullName] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [classId, setClassId] = useState<string>("unassigned");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [previousSchool, setPreviousSchool] = useState("");
  const [passportPreview, setPassportPreview] = useState<string>("");
  const [passportUrl, setPassportUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const [bloodGroup, setBloodGroup] = useState("");
  const [genotype, setGenotype] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [stateOfOrigin, setStateOfOrigin] = useState("");
  const [lga, setLga] = useState("");
  const [religion, setReligion] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setFullName(student.profiles?.full_name || "");
      setAdmissionNo(student.admission_no || "");
      setClassId(student.class_id || "unassigned");
      setGender(student.gender || "");
      setDateOfBirth(
        student.date_of_birth
          ? new Date(student.date_of_birth).toISOString().split("T")[0]
          : ""
      );
      setPreviousSchool(student.previous_school || "");
      const existingAvatar = student.profiles?.avatar_url || "";
      setPassportUrl(existingAvatar);
      setPassportPreview(existingAvatar);

      setBloodGroup(student.blood_group || "");
      setGenotype(student.genotype || "");
      setMedicalConditions(student.medical_conditions || "");
      setStateOfOrigin(student.state_of_origin || "");
      setLga(student.lga || "");
      setReligion(student.religion || "");
      setResidentialAddress(student.residential_address || "");
    }
  }, [student]);

  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Passport photo size must be less than 2MB");
      return;
    }

    setUploading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setPassportPreview(base64String);

      try {
        const result = await uploadStudentPassport(
          schoolId || "school",
          student.id || "student",
          base64String
        );
        if (result.success && result.publicUrl) {
          setPassportUrl(result.publicUrl);
          toast.success("Passport photo uploaded successfully");
        } else {
          toast.error(result.error || "Failed to upload passport photo");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to upload passport photo");
      } finally {
        setUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const removePassport = () => {
    setPassportPreview("");
    setPassportUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    if (!fullName.trim() || !admissionNo.trim()) {
      toast.error("Full Name and Admission Number are required.");
      return;
    }

    setSaving(true);
    try {
      const result = await updateStudent({
        studentId: student.id,
        userId: student.user_id,
        fullName: fullName.trim(),
        admissionNo: admissionNo.trim(),
        classId: classId === "unassigned" ? null : classId,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        previousSchool: previousSchool || undefined,
        passportUrl: passportUrl || undefined,
        bloodGroup: bloodGroup || undefined,
        genotype: genotype || undefined,
        medicalConditions: medicalConditions || undefined,
        stateOfOrigin: stateOfOrigin || undefined,
        lga: lga || undefined,
        religion: religion || undefined,
        residentialAddress: residentialAddress || undefined,
        subdomain,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Student updated successfully.");
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update student.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 md:p-8 bg-white border-none shadow-2xl">
        <DialogHeader className="space-y-1 border-b pb-4">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Edit3 className="size-5" />
            <span>Edit Student Profile</span>
          </div>
          <DialogTitle className="text-2xl font-black text-slate-900">
            {student?.profiles?.full_name || "Student"}
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-600">
            Update passport photo, academic placement, demographics, and medical records.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Section 1: Academic & Basic */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-primary">
              1. Academic &amp; Identity
            </h4>

            {/* Passport Photograph */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-50 border">
              <div className="relative size-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-white shrink-0">
                {passportPreview ? (
                  <>
                    <img
                      src={passportPreview}
                      alt="Passport Preview"
                      className="object-cover size-full"
                    />
                    <button
                      type="button"
                      onClick={removePassport}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform"
                    >
                      <X className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <label
                    htmlFor="edit-passport-input"
                    className="cursor-pointer flex flex-col items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Camera className="size-6 mb-1 opacity-60" />
                    <span className="text-[10px] font-bold text-center">
                      Upload Photo
                    </span>
                  </label>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    <span className="text-[9px] font-bold uppercase tracking-wider mt-1">
                      Uploading
                    </span>
                  </div>
                )}
              </div>
              <input
                id="edit-passport-input"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handlePassportUpload}
                disabled={uploading}
              />
              <div className="space-y-1 text-center sm:text-left">
                <Label htmlFor="edit-passport-input" className="font-bold text-slate-800 block">
                  Passport Photograph
                </Label>
                <p className="text-xs text-muted-foreground font-medium">
                  PNG, JPG, or WebP. Maximum size 2MB.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="font-bold text-slate-700">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Oladapo Shittu"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admissionNo" className="font-bold text-slate-700">
                  Admission No <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="admissionNo"
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                  placeholder="e.g. ADM-2025-001"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Assigned Class</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="font-bold text-slate-700">
                  Date of Birth
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousSchool" className="font-bold text-slate-700">
                Previous School Attended
              </Label>
              <Input
                id="previousSchool"
                value={previousSchool}
                onChange={(e) => setPreviousSchool(e.target.value)}
                placeholder="e.g. Glory Days Primary School"
              />
            </div>
          </div>

          {/* Section 2: Demographics */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-primary">
              2. Demographics &amp; Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">State of Origin</Label>
                <Select
                  value={stateOfOrigin}
                  onValueChange={setStateOfOrigin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lga" className="font-bold text-slate-700">
                  LGA
                </Label>
                <Input
                  id="lga"
                  value={lga}
                  onChange={(e) => setLga(e.target.value)}
                  placeholder="e.g. Ikeja"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="religion" className="font-bold text-slate-700">
                  Religion
                </Label>
                <Input
                  id="religion"
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  placeholder="e.g. Christianity / Islam"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="font-bold text-slate-700">
                  Residential Address
                </Label>
                <Input
                  id="address"
                  value={residentialAddress}
                  onChange={(e) => setResidentialAddress(e.target.value)}
                  placeholder="Street address"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Medical Profile */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-rose-600">
              3. Medical Profile
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bloodGroup" className="font-bold text-slate-700">
                  Blood Group
                </Label>
                <Input
                  id="bloodGroup"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  placeholder="e.g. O+, A+, B+"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="genotype" className="font-bold text-slate-700">
                  Genotype
                </Label>
                <Input
                  id="genotype"
                  value={genotype}
                  onChange={(e) => setGenotype(e.target.value)}
                  placeholder="e.g. AA, AS"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditions" className="font-bold text-slate-700">
                Medical Conditions / Allergies
              </Label>
              <Textarea
                id="conditions"
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
                placeholder="List any known medical conditions or food/medication allergies"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving || uploading}
              className="font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || uploading}
              className="font-bold"
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
