import { useState } from "react"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { authApi } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, KeyRound } from "lucide-react"

import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function ChangePasswordModal({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Auth")
  const [isOpen, setIsOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  
  const formSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, t("passwordTooShort") || "Password too short"),
    confirmPassword: z.string().min(8, t("passwordTooShort") || "Password too short"),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t("passwordsDoNotMatch") || "Passwords do not match",
    path: ["confirmPassword"],
  })

  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      setErrorMsg("")
      await authApi.changePassword({
        current_password: values.currentPassword,
        new_password: values.newPassword,
      })
      toast.success("Password changed successfully")
      setIsOpen(false)
      form.reset()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      const msg = error.response?.data?.detail || "Failed to change password"
      setErrorMsg(msg)
      toast.error(msg)
    }
  }

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      setIsOpen={(open) => {
        setIsOpen(open)
        if (!open) { form.reset(); setErrorMsg("") }
      }}
      trigger={children}
      className="sm:max-w-md bg-background/95 backdrop-blur-3xl border-border/10"
      title={
        <span className="flex items-center gap-2 text-xl font-heading font-black italic uppercase">
          <KeyRound className="w-5 h-5 text-primary" />
          Change Password
        </span>
      }
      description={
        <span className="font-micro text-xs tracking-widest uppercase mt-1 block">
          Update your account security credentials.
        </span>
      }
    >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold font-micro">
            {errorMsg}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-micro text-[10px] tracking-widest uppercase ml-1">Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} className="h-12 bg-foreground/[0.02] border-border/5 rounded-xl font-mono text-sm" />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-micro text-[10px] tracking-widest uppercase ml-1">New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} className="h-12 bg-foreground/[0.02] border-border/5 rounded-xl font-mono text-sm" />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-micro text-[10px] tracking-widest uppercase ml-1">Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} className="h-12 bg-foreground/[0.02] border-border/5 rounded-xl font-mono text-sm" />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-border/10 mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="rounded-xl bg-primary text-white">
                {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
    </ResponsiveDialog>
  )
}
