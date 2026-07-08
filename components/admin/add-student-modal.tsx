"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  User, 
  BookOpen, 
  Globe, 
  Activity, 
  KeyRound, 
  ChevronDown, 
  ChevronUp, 
  Upload, 
  X, 
  Camera 
} from "lucide-react";
import { createStudent, uploadStudentPassport } from "@/app/actions/admin-actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { AddParentModal } from "@/components/admin/add-parent-modal";
import { compressImageToBase64 } from "@/lib/utils";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", 
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", 
  "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"
];

const studentSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().optional().or(z.literal("")),
  admissionNo: z.string().min(3, "Admission number is required"),
  classId: z.string().min(1, "Class is required"),
  gender: z.enum(["male", "female"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
  // New mandatory fields
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  passportUrl: z.string().min(1, "Passport photograph is required"),
  // Optional demographic / medical fields
  stateOfOrigin: z.string().optional(),
  lga: z.string().optional(),
  religion: z.string().optional(),
  residentialAddress: z.string().optional(),
  bloodGroup: z.string().optional(),
  genotype: z.string().optional(),
  medicalConditions: z.string().optional(),
  previousSchool: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  subdomain: string;
}

export function AddStudentModal({ isOpen, onClose, onSuccess, schoolId, subdomain }: AddStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [parentSuggestions, setParentSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAddParentOpen, setIsAddParentOpen] = useState(false);
  const [passportPreview, setPassportPreview] = useState<string>("");
  const supabase = createClient();

  // Manage collapsible sections
  const [openSections, setOpenSections] = useState({
    basic: true,
    academic: false,
    demographics: false,
    medical: false,
    credentials: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: "",
      email: "",
      admissionNo: "",
      classId: "",
      gender: "male",
      password: "",
      dateOfBirth: "",
      passportUrl: "",
      stateOfOrigin: "",
      lga: "",
      religion: "",
      residentialAddress: "",
      bloodGroup: "",
      genotype: "",
      medicalConditions: "",
      previousSchool: "",
    },
  });

  const emailValue = form.watch("email") || "";

  useEffect(() => {
    if (isOpen && schoolId) {
      const fetchClasses = async () => {
        const { data } = await supabase
          .from("classes")
          .select("id, name")
          .eq("school_id", schoolId)
          .order("name");
        setClasses(data || []);
      };
      const fetchParents = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("role", "parent")
          .eq("school_id", schoolId)
          .eq("is_active", true);
        setParents(data || []);
      };
      fetchClasses();
      fetchParents();
    }
  }, [isOpen, schoolId, supabase]);

  useEffect(() => {
    if (emailValue.trim() === "") {
      setParentSuggestions([]);
      return;
    }
    const filtered = parents.filter(p => 
      p.email?.toLowerCase().includes(emailValue.toLowerCase()) || 
      p.full_name?.toLowerCase().includes(emailValue.toLowerCase())
    );
    setParentSuggestions(filtered);
  }, [emailValue, parents]);

  // Handle passport photo selection and upload
  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Passport photo size must be less than 2MB");
      return;
    }

    setUploading(true);

    try {
      const base64String = await compressImageToBase64(file, 600, 600, 0.82);
      setPassportPreview(base64String);

      const tempStudentId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15);

      const result = await uploadStudentPassport(schoolId, tempStudentId, base64String);
      if (result.success && result.publicUrl) {
        form.setValue("passportUrl", result.publicUrl);
        toast.success("Passport photo uploaded successfully");
      } else {
        toast.error(result.error || "Failed to upload passport photo");
        setPassportPreview("");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload passport photo");
      setPassportPreview("");
    } finally {
      setUploading(false);
    }
  };

  const removePassport = () => {
    setPassportPreview("");
    form.setValue("passportUrl", "");
  };

  const onSubmit = async (values: StudentFormValues) => {
    setLoading(true);
    try {
      const result = await createStudent({
        ...values,
        schoolId,
        subdomain,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Student enrolled successfully.");
        form.reset();
        setPassportPreview("");
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-1">
          <DialogHeader>
            <DialogTitle>Enroll New Student</DialogTitle>
            <DialogDescription>
              Provide student details below to enroll them in the school.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* SECTION 1: BASIC INFO */}
            <div className="border border-border rounded-xl overflow-hidden bg-card/50">
              <button
                type="button"
                onClick={() => toggleSection("basic")}
                className="w-full flex justify-between items-center p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors font-bold text-xs uppercase tracking-wider text-muted-foreground"
              >
                <span className="flex items-center gap-2.5">
                  <User className="size-4 text-primary" />
                  Basic Information
                </span>
                {openSections.basic ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {openSections.basic && (
                <div className="p-4 grid grid-cols-2 gap-4 border-t border-border">
                  {/* Passport Photo */}
                  <div className="col-span-2 flex flex-col items-center justify-center border-b pb-4 mb-2">
                    <Label className="mb-2 text-xs font-semibold self-start flex gap-1">
                      Passport Photograph <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative size-28 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-accent/40">
                      {passportPreview ? (
                        <>
                          <img src={passportPreview} alt="Passport Preview" className="object-cover w-full h-full" />
                          <button
                            type="button"
                            onClick={removePassport}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform"
                          >
                            <X className="size-3.5" />
                          </button>
                        </>
                      ) : (
                        <label htmlFor="passport-input" className="cursor-pointer flex flex-col items-center text-muted-foreground hover:text-foreground transition-colors">
                          <Camera className="size-6 mb-1 opacity-40" />
                          <span className="text-[10px] font-semibold text-center">Click to Upload</span>
                        </label>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                          <Loader2 className="size-5 animate-spin text-primary" />
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-1">Uploading</span>
                        </div>
                      )}
                    </div>
                    <input 
                      id="passport-input"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handlePassportUpload}
                      disabled={uploading}
                    />
                    <p className="text-[9px] text-muted-foreground mt-1.5 text-center">Max 2MB. PNG, JPG, WebP formats only.</p>
                    {form.formState.errors.passportUrl && (
                      <p className="text-xs text-destructive font-semibold mt-1">{form.formState.errors.passportUrl.message}</p>
                    )}
                  </div>

                  {/* Full Name */}
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-semibold">Full Name <span className="text-destructive">*</span></Label>
                    <Input id="fullName" {...form.register("fullName")} placeholder="Jane Doe" className="h-10 text-sm" />
                    {form.formState.errors.fullName && (
                      <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dateOfBirth" className="text-xs font-semibold">Date of Birth <span className="text-destructive">*</span></Label>
                    <Input id="dateOfBirth" type="date" {...form.register("dateOfBirth")} className="h-10 text-sm" />
                    {form.formState.errors.dateOfBirth && (
                      <p className="text-xs text-destructive">{form.formState.errors.dateOfBirth.message}</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <Label htmlFor="gender" className="text-xs font-semibold">Gender <span className="text-destructive">*</span></Label>
                    <Select onValueChange={(val) => form.setValue("gender", val as any)} defaultValue="male">
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: ACADEMIC INFO */}
            <div className="border border-border rounded-xl overflow-hidden bg-card/50">
              <button
                type="button"
                onClick={() => toggleSection("academic")}
                className="w-full flex justify-between items-center p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors font-bold text-xs uppercase tracking-wider text-muted-foreground"
              >
                <span className="flex items-center gap-2.5">
                  <BookOpen className="size-4 text-primary" />
                  Academic History
                </span>
                {openSections.academic ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {openSections.academic && (
                <div className="p-4 grid grid-cols-2 gap-4 border-t border-border">
                  <div className="space-y-1.5">
                    <Label htmlFor="admissionNo" className="text-xs font-semibold">Admission No <span className="text-destructive">*</span></Label>
                    <Input id="admissionNo" {...form.register("admissionNo")} placeholder="STD/2024/001" className="h-10 text-sm" />
                    {form.formState.errors.admissionNo && (
                      <p className="text-xs text-destructive">{form.formState.errors.admissionNo.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="classId" className="text-xs font-semibold">Class <span className="text-destructive">*</span></Label>
                    <Select onValueChange={(val) => form.setValue("classId", val)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                        {classes.length === 0 && (
                          <SelectItem value="none" disabled>No classes found. Add classes in Settings.</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.classId && (
                      <p className="text-xs text-destructive">{form.formState.errors.classId.message}</p>
                    )}
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="previousSchool" className="text-xs font-semibold">Previous School</Label>
                    <Input id="previousSchool" {...form.register("previousSchool")} placeholder="e.g. International Nursery & Primary School" className="h-10 text-sm" />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: DEMOGRAPHICS */}
            <div className="border border-border rounded-xl overflow-hidden bg-card/50">
              <button
                type="button"
                onClick={() => toggleSection("demographics")}
                className="w-full flex justify-between items-center p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors font-bold text-xs uppercase tracking-wider text-muted-foreground"
              >
                <span className="flex items-center gap-2.5">
                  <Globe className="size-4 text-primary" />
                  Demographics
                </span>
                {openSections.demographics ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {openSections.demographics && (
                <div className="p-4 grid grid-cols-2 gap-4 border-t border-border">
                  <div className="space-y-1.5">
                    <Label htmlFor="stateOfOrigin" className="text-xs font-semibold">State of Origin</Label>
                    <Select onValueChange={(val) => form.setValue("stateOfOrigin", val)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px]">
                        {NIGERIAN_STATES.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lga" className="text-xs font-semibold">L.G.A of Origin</Label>
                    <Input id="lga" {...form.register("lga")} placeholder="e.g. Ikeja" className="h-10 text-sm" />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="religion" className="text-xs font-semibold">Religion</Label>
                    <Select onValueChange={(val) => form.setValue("religion", val)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select Religion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Christianity">Christianity</SelectItem>
                        <SelectItem value="Islam">Islam</SelectItem>
                        <SelectItem value="Traditional">Traditional</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="residentialAddress" className="text-xs font-semibold">Residential Address</Label>
                    <Input id="residentialAddress" {...form.register("residentialAddress")} placeholder="e.g. 15, Adeola Hopewell Street, Victoria Island, Lagos" className="h-10 text-sm" />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: MEDICAL DETAILS */}
            <div className="border border-border rounded-xl overflow-hidden bg-card/50">
              <button
                type="button"
                onClick={() => toggleSection("medical")}
                className="w-full flex justify-between items-center p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors font-bold text-xs uppercase tracking-wider text-muted-foreground"
              >
                <span className="flex items-center gap-2.5">
                  <Activity className="size-4 text-primary" />
                  Medical Details
                </span>
                {openSections.medical ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {openSections.medical && (
                <div className="p-4 grid grid-cols-2 gap-4 border-t border-border">
                  <div className="space-y-1.5">
                    <Label htmlFor="bloodGroup" className="text-xs font-semibold">Blood Group</Label>
                    <Select onValueChange={(val) => form.setValue("bloodGroup", val)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="genotype" className="text-xs font-semibold">Genotype</Label>
                    <Select onValueChange={(val) => form.setValue("genotype", val)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {["AA", "AS", "SS", "AC", "SC"].map((gt) => (
                          <SelectItem key={gt} value={gt}>{gt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="medicalConditions" className="text-xs font-semibold">Allergies / Special Medical Conditions</Label>
                    <Input id="medicalConditions" {...form.register("medicalConditions")} placeholder="e.g. Asthma, Peanut Allergy (Leave blank if none)" className="h-10 text-sm" />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 5: CREDENTIALS & PARENT LINK */}
            <div className="border border-border rounded-xl overflow-hidden bg-card/50">
              <button
                type="button"
                onClick={() => toggleSection("credentials")}
                className="w-full flex justify-between items-center p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors font-bold text-xs uppercase tracking-wider text-muted-foreground"
              >
                <span className="flex items-center gap-2.5">
                  <KeyRound className="size-4 text-primary" />
                  Parent & Credentials
                </span>
                {openSections.credentials ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {openSections.credentials && (
                <div className="p-4 grid grid-cols-2 gap-4 border-t border-border">
                  <div className="col-span-2 space-y-1.5 relative">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="email" className="text-xs font-semibold">Parent Email (Optional)</Label>
                      <button 
                        type="button" 
                        onClick={() => setIsAddParentOpen(true)} 
                        className="text-[10px] text-primary hover:underline font-bold"
                      >
                        + Create Parent
                      </button>
                    </div>
                    <Input 
                      id="email" 
                      placeholder="parent@example.com" 
                      value={form.watch("email") || ""}
                      className="h-10 text-sm"
                      onChange={(e) => {
                        form.setValue("email", e.target.value);
                        setShowSuggestions(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          const val = form.getValues("email")?.trim() || "";
                          if (val !== "") {
                            const match = parents.find(p => p.email?.toLowerCase() === val.toLowerCase());
                            if (!match) {
                              toast.error("Parent email not registered. Field cleared.", {
                                description: "Children must be linked to registered parents. Leave blank if parent is not yet registered."
                              });
                              form.setValue("email", "");
                            }
                          }
                          setShowSuggestions(false);
                        }, 250);
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground italic mt-0.5">Students log in using their admission number. Parent link is optional.</p>
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                    {showSuggestions && parentSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full bg-popover border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto mt-1">
                        {parentSuggestions.map((p) => (
                          <div
                            key={p.email}
                            onClick={() => {
                              form.setValue("email", p.email);
                              setShowSuggestions(false);
                            }}
                            className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-xs flex justify-between items-center"
                          >
                            <span className="font-semibold">{p.full_name}</span>
                            <span className="text-muted-foreground">{p.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-semibold">Login Password <span className="text-destructive">*</span></Label>
                    <PasswordInput id="password" {...form.register("password")} placeholder="••••••••" className="h-10 text-sm" />
                    {form.formState.errors.password && (
                      <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enroll Student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    
    <AddParentModal 
      isOpen={isAddParentOpen}
      onClose={() => setIsAddParentOpen(false)}
      onSuccess={(email) => {
        if (email) {
          form.setValue("email", email);
          const fetchParents = async () => {
            const { data } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("role", "parent")
              .eq("school_id", schoolId)
              .eq("is_active", true);
            setParents(data || []);
          };
          fetchParents();
        }
      }}
      schoolId={schoolId}
      subdomain={subdomain}
      initialEmail={emailValue}
    />
    </>
  );
}
