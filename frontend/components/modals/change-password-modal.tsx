"use client"

import { useState } from "react"
import { Loader2, Lock, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usersApi } from "@/lib/api"

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"form" | "success">("form")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match")
        return
    }
    
    setLoading(true)
    try {
        await usersApi.updateMe({ password: newPassword })
        setStep("success")
        toast.success("Password updated successfully")
        
        // Auto close after success
        setTimeout(() => {
            onClose()
            setStep("form")
            // Reset form
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
        }, 2000)
    } catch (err) {
        toast.error("Failed to update password. Please try again.")
    } finally {
        setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Ensure your account is secure with a strong password.
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="current">Current Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input id="current" type="password" className="pl-9 bg-white/5 border-white/10" placeholder="••••••••" required />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="new">New Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input id="new" type="password" className="pl-9 bg-white/5 border-white/10" placeholder="••••••••" required />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input id="confirm" type="password" className="pl-9 bg-white/5 border-white/10" placeholder="••••••••" required />
                </div>
            </div>
            
            <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={onClose} className="text-neutral-400 hover:text-white">Cancel</Button>
                <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                </Button>
            </DialogFooter>
            </form>
        ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-medium text-white">Password Updated</h3>
                <p className="text-sm text-neutral-400 text-center">Your password has been changed successfully. You will be redirected shortly.</p>
            </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
