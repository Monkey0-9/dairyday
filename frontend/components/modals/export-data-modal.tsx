"use client"

import { useState } from "react"
import { Loader2, Download, CheckCircle2, FileText, Calendar, Wallet } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface ExportDataModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ExportDataModal({ isOpen, onClose }: ExportDataModalProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"select" | "processing" | "done">("select")

  const handleExport = async () => {
    setStep("processing")
    setLoading(true)
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setLoading(false)
    setStep("done")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export My Data</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Select the data you want to download. A ZIP file will be generated.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
            <div className="space-y-4 py-2">
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors cursor-pointer">
                    <Checkbox id="consumption" defaultChecked className="border-white/30 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                    <div className="flex-1">
                        <Label htmlFor="consumption" className="text-sm font-medium text-white cursor-pointer block">Consumption Records</Label>
                        <p className="text-xs text-neutral-500">Daily milk logs and delivery history</p>
                    </div>
                    <FileText className="h-4 w-4 text-neutral-500" />
                </div>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors cursor-pointer">
                    <Checkbox id="billing" defaultChecked className="border-white/30 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                    <div className="flex-1">
                        <Label htmlFor="billing" className="text-sm font-medium text-white cursor-pointer block">Billing History</Label>
                        <p className="text-xs text-neutral-500">Invoices, payments, and due amounts</p>
                    </div>
                    <Wallet className="h-4 w-4 text-neutral-500" />
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors cursor-pointer">
                    <Checkbox id="profile" defaultChecked className="border-white/30 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                    <div className="flex-1">
                        <Label htmlFor="profile" className="text-sm font-medium text-white cursor-pointer block">Profile Data</Label>
                        <p className="text-xs text-neutral-500">Personal details and preferences</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-neutral-500" />
                </div>
            </div>
        )}

        {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                <p className="text-sm text-neutral-400">Compiling your data...</p>
            </div>
        )}

        {step === "done" && (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Download className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-medium text-white">Ready for Download</h3>
                    <p className="text-sm text-neutral-400">Your data export is ready.</p>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" onClick={onClose}>
                    Download ZIP (2.4 MB)
                </Button>
            </div>
        )}

        {step === "select" && (
            <DialogFooter>
                <Button variant="ghost" onClick={onClose} className="text-neutral-400 hover:text-white">Cancel</Button>
                <Button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    Start Export
                </Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
