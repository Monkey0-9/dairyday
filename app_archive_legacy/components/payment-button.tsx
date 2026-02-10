import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentButtonProps {
  billId: string;
  amount: number;
  onSuccess: () => void;
  onFailure: () => void;
}

export function PaymentButton({ billId, amount, onSuccess, onFailure }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      // 1. Create Order on Server
      const res = await fetch(`${API_URL}/payments/create-order/${billId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to create order");
      const data = await res.json();

      // 2. Initialize Razorpay
      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        
        script.onload = () => {
            openRazorpay(data);
        };
        // Fallback if already loaded
        if (window.Razorpay) openRazorpay(data);
      } else {
        openRazorpay(data);
      }

    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment initialization failed");
      onFailure();
    } finally {
      setLoading(false);
    }
  };

  const openRazorpay = (orderData: any) => {
    const options = {
      key: orderData.key_id || "rzp_test_KEY_ID", // Replace with your key
      amount: orderData.amount,
      currency: orderData.currency,
      name: "Dairy Management",
      description: `Bill Payment ${billId}`,
      order_id: orderData.id,
      handler: (response: any) => {
        // Payment successful
        alert("Payment Successful! Payment ID: " + response.razorpay_payment_id);
        onSuccess();
      },
      prefill: {
        name: "Customer Name",
        email: "customer@example.com",
      },
      theme: {
        color: "#3399cc",
      },
    };

    const rzp1 = new window.Razorpay(options);
    rzp1.open();
  };

  return (
    <Button onClick={handlePayment} disabled={loading} className="w-full">
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Pay ₹{amount}
    </Button>
  );
}

