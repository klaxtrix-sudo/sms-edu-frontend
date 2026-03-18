"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface SchoolLogoUploadProps {
  value?: string;
  onChange: (url: string) => void;
  schoolId: string;
}

export function SchoolLogoUpload({ value, onChange, schoolId }: SchoolLogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB");
        return;
      }

      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${schoolId}/logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("school-assets")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("school-assets")
        .getPublicUrl(filePath);

      onChange(publicUrl);
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    onChange("");
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative group size-32 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-accent/50">
        {value ? (
          <>
            <Image
              src={value}
              alt="School Logo"
              fill
              className="object-contain p-2"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                type="button"
                onClick={removeLogo}
                className="p-2 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform"
              >
                <X className="size-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <ImageIcon className="size-8 mb-2 opacity-20" />
            <span className="text-xs font-medium">No Logo</span>
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10">
            <Loader2 className="size-6 animate-spin text-primary mb-2" />
            <span className="text-[10px] font-medium uppercase tracking-tighter">Uploading</span>
          </div>
        )}
      </div>

      <div className="w-full">
        <Label htmlFor="logo-input" className="cursor-pointer">
          <div className="flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors text-sm font-medium">
            <Upload className="size-4" />
            {value ? "Change Logo" : "Upload Logo"}
          </div>
        </Label>
        <input 
          id="logo-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Max 2MB. Supports PNG, JPG, SVG.
      </p>
    </div>
  );
}

// Inline Label for the upload component to avoid circular or missing dependencies
function Label({ children, className, ...props }: any) {
  return (
    <label className={cn("text-sm font-medium leading-none", className)} {...props}>
      {children}
    </label>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
