"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { SchoolLogoUpload } from "@/components/admin/school-logo-upload";
import { Loader2, Save } from "lucide-react";

const schoolSchema = z.object({
  name: z.string().min(3, "School name must be at least 3 characters"),
  address: z.string().min(5, "Address is required"),
  academic_year: z.string().regex(/^\d{4}\/\d{4}$/, "Format: 2024/2025"),
  current_term: z.string(),
  logo_url: z.string().optional(),
});

type SchoolFormValues = z.infer<typeof schoolSchema>;

export default function SchoolSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: "",
      address: "",
      academic_year: "2025/2026",
      current_term: "1",
      logo_url: "",
    },
  });

  useEffect(() => {
    async function loadSchoolData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user's school ID from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", user.id)
          .single() as any;

        if (profile?.school_id) {
          setSchoolId(profile.school_id as string);
          const { data: school } = await supabase
            .from("schools")
            .select("*")
            .eq("id", profile.school_id as string)
            .single() as any;

          if (school) {
            form.reset({
              name: school.name,
              address: school.address || "",
              academic_year: school.academic_year,
              current_term: String(school.current_term),
              logo_url: school.logo_url || "",
            });
          }
        }
      } catch (error) {
        console.error("Error loading school data:", error);
        toast.error("Failed to load school settings");
      } finally {
        setLoading(false);
      }
    }

    loadSchoolData();
  }, [supabase, form]);

  const onSubmit = async (values: SchoolFormValues) => {
    if (!schoolId) {
      toast.error("School ID not found");
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("schools")
        .update({
          name: values.name,
          address: values.address,
          academic_year: values.academic_year,
          current_term: parseInt(values.current_term),
          logo_url: values.logo_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", schoolId);

      if (error) throw error;
      toast.success("School information updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update school settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">School Settings</h1>
        <p className="text-muted-foreground">Manage your school's identity and current academic period.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>School Logo</CardTitle>
              <CardDescription>This logo will appear on report cards and receipts.</CardDescription>
            </CardHeader>
            <CardContent>
              <SchoolLogoUpload 
                value={form.watch("logo_url")} 
                onChange={(url) => form.setValue("logo_url", url)}
                schoolId={schoolId!}
              />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Basic details about your institution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">School Name</Label>
                <Input id="name" {...form.register("name")} placeholder="e.g. Zenith International School" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Physical Address</Label>
                <Input id="address" {...form.register("address")} placeholder="123 Education Lane, Lagos" />
                {form.formState.errors.address && (
                  <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Academic Year</Label>
                  <Input id="academic_year" {...form.register("academic_year")} placeholder="2025/2026" />
                  {form.formState.errors.academic_year && (
                    <p className="text-xs text-destructive">{form.formState.errors.academic_year.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_term">Current Term</Label>
                  <Select 
                    value={form.watch("current_term")} 
                    onValueChange={(val) => form.setValue("current_term", val)}
                  >
                    <SelectTrigger id="current_term">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">First Term</SelectItem>
                      <SelectItem value="2">Second Term</SelectItem>
                      <SelectItem value="3">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
