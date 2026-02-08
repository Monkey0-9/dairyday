"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Droplet, CheckCircle, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center">
              <Droplet className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl">dairyday</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Simple Dairy Management
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Track milk deliveries, generate bills, and accept payments — all in one place.
        </p>
        <Link href="/login">
          <Button size="lg" className="w-full sm:w-auto">
            Sign In
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Droplet className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">Daily Entry</h3>
            <p className="text-gray-600 text-sm">
              Quick and easy daily milk entry for each customer.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Auto Bills</h3>
            <p className="text-gray-600 text-sm">
              Monthly bills generated automatically with totals.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <ArrowRight className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Online Payment</h3>
            <p className="text-gray-600 text-sm">
              Accept payments securely via Razorpay.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div>
              <div className="h-12 w-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Enter Daily Milk</h3>
              <p className="text-gray-600 text-sm">
                Admin logs milk delivered to each customer each day.
              </p>
            </div>
            <div>
              <div className="h-12 w-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Generate Bill</h3>
              <p className="text-gray-600 text-sm">
                At month end, bills are auto-generated with totals.
              </p>
            </div>
            <div>
              <div className="h-12 w-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Customer Pays</h3>
              <p className="text-gray-600 text-sm">
                Customers view bill and pay online securely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} dairyday. Simple dairy management.
        </div>
      </footer>
    </div>
  )
}

