'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download, RefreshCw, FileText, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BillCardProps {
  bill: {
    id: string
    month: string
    total_liters: number
    total_amount: number
    status: 'PAID' | 'UNPAID'
    pdf_url?: string | null
    created_at?: string
  } | null
  userId: string
  onRefresh?: () => void
  onPay?: () => void
  className?: string
}

export default function BillCard({ bill, userId, onRefresh, onPay, className }: BillCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Loading state
  if (!bill) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/4 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded w-1/2" />
        </CardContent>
      </Card>
    )
  }

  // PDF not yet ready - show processing state
  if (!bill.pdf_url) {
    return (
      <Card className={cn('border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              Invoice — {bill.month}
            </CardTitle>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              Processing
            </Badge>
          </div>
          <CardDescription>
            Total: <span className="font-semibold">₹{Number(bill.total_amount).toFixed(2)}</span>
            {' · '}
            {Number(bill.total_liters).toFixed(2)} liters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/20">
            <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Invoice is being generated
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                This usually takes less than a minute. Please wait...
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsRefreshing(true)
              onRefresh?.()
              setTimeout(() => setIsRefreshing(false), 2000)
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Status
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // PDF is ready - show download button
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice — {bill.month}
          </CardTitle>
          <Badge
            variant={bill.status === 'PAID' ? 'default' : 'secondary'}
            className={cn(
              bill.status === 'PAID' && 'bg-green-600'
            )}
          >
            {bill.status}
          </Badge>
        </div>
        <CardDescription>
          Total: <span className="font-semibold">₹{Number(bill.total_amount).toFixed(2)}</span>
          {' · '}
          {Number(bill.total_liters).toFixed(2)} liters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment Status</span>
            <span className={cn(
              'font-medium',
              bill.status === 'PAID' ? 'text-green-600' : 'text-amber-600'
            )}>
              {bill.status === 'PAID' ? 'Paid' : 'Payment Pending'}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-4">
        {bill.status !== 'PAID' && onPay && (
          <Button onClick={onPay} className="flex-1" variant="default">
            Pay Now
          </Button>
        )}
        <a
          href={bill.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-2',
            bill.status === 'PAID' ? 'flex-1' : 'flex-1'
          )}
        >
          <Button variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </a>
      </CardFooter>
    </Card>
  )
}

