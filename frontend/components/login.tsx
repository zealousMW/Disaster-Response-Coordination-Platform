"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const USERS = [
  { id: "reliefAdmin", label: "🛠️ Relief Admin" },
  { id: "netrunnerX", label: "🌐 Netrunner X" },
];

export default function Login({ onLogin }: { onLogin?: () => void }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleLogin = () => {
    if (!selected) {
      setError("Please select a user role to continue.");
      return;
    }
    localStorage.setItem("userId", selected);
    setError("");
    if (onLogin) onLogin();
    router.push("/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
      <Card className="w-full max-w-md shadow-xl border border-red-500">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">
            🧭 Disaster Management Login
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select your role to begin coordination
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select onValueChange={setSelected}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select User Role" />
            </SelectTrigger>
            <SelectContent>
              {USERS.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleLogin} className="w-full bg-red-600 hover:bg-red-700">
            Login
          </Button>

          {error && (
            <div className="flex items-center text-sm text-red-500 gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
