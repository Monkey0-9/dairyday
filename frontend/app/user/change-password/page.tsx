"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const changePasswordSchema = z.object({
  old_password: z.string().min(1, { message: "Old password is required" }),
  new_password: z.string().min(6, { message: "New password must be at least 6 characters" }),
  confirm_password: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function UserChangePassword() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/auth/change-password`,
        {
          old_password: data.old_password,
          new_password: data.new_password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess("Password changed successfully!");
      reset();

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/user/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-10 w-10 bg-primary rounded-lg flex items-center justify-center mb-4">
            <svg
              className="h-6 w-6 text-primary-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Change Password</h1>
          <p className="text-sm text-muted-foreground">
            Update your account password
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium text-center">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-green-100 p-3 text-sm text-green-700 font-medium text-center">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <Input
                  id="old_password"
                  type="password"
                  placeholder="Current password"
                  {...register("old_password")}
                  className={cn(errors.old_password && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.old_password && (
                  <p className="text-xs text-destructive">{errors.old_password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Input
                  id="new_password"
                  type="password"
                  placeholder="New password"
                  {...register("new_password")}
                  className={cn(errors.new_password && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.new_password && (
                  <p className="text-xs text-destructive">{errors.new_password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="Confirm new password"
                  {...register("confirm_password")}
                  className={cn(errors.confirm_password && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.confirm_password && (
                  <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/user/dashboard")}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <a href="/user/dashboard" className="underline underline-offset-4 hover:text-primary">
            Back to Dashboard
          </a>
        </p>
      </div>
    </div>
  );
}

