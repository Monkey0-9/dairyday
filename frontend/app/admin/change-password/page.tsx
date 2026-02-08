"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const changePasswordSchema = z.object({
  old_password: z.string().min(1, { message: "Old password is required" }),
  new_password: z.string().min(6, { message: "New password must be at least 6 characters" }),
  confirm_password: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function AdminChangePassword() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
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
      
      setSuccess('Password changed successfully!');
      reset();
      
      // Redirect to consumption page after 2 seconds
      setTimeout(() => {
        router.push('/admin/consumption');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-96">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Change Password</CardTitle>
          <CardDescription className="text-center">Update your admin password</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {success && <p className="text-green-500 text-sm text-center">{success}</p>}
            
            <div className="space-y-2">
              <label htmlFor="old_password" className="text-sm font-medium leading-none">
                Old Password
              </label>
              <Input 
                id="old_password" 
                type="password" 
                {...register("old_password")} 
              />
              {errors.old_password && (
                <p className="text-xs text-red-500">{errors.old_password.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="new_password" className="text-sm font-medium leading-none">
                New Password
              </label>
              <Input 
                id="new_password" 
                type="password" 
                {...register("new_password")} 
              />
              {errors.new_password && (
                <p className="text-xs text-red-500">{errors.new_password.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="confirm_password" className="text-sm font-medium leading-none">
                Confirm New Password
              </label>
              <Input 
                id="confirm_password" 
                type="password" 
                {...register("confirm_password")} 
              />
              {errors.confirm_password && (
                <p className="text-xs text-red-500">{errors.confirm_password.message}</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => router.push('/admin/consumption')}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Changing...' : 'Change'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

