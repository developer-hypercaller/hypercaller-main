"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OTPInput } from "@/components/ui/otp-input";
import { Toast } from "@/components/ui/toast";
import { Progress } from "@/components/ui/progress";
import { Zap, ChevronLeft, ChevronRight } from "lucide-react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phoneNumber: "",
    otp: "",
    role: "user" as "user" | "business",
    avatar: "",
    password: "",
    confirmPassword: "",
  });
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        no_code: "Authorization was cancelled or failed.",
        config_error: "OAuth configuration error. Please contact support.",
        oauth_failed: "Google authentication failed. Please try again.",
      };
      setError(errorMessages[errorParam] || "An error occurred during authentication.");
    }
  }, [searchParams]);

  // Dummy avatars
  const avatars = [
    { id: "avatar1", emoji: "👤", name: "Person" },
    { id: "avatar2", emoji: "👨‍💼", name: "Business" },
    { id: "avatar3", emoji: "👩‍💼", name: "Professional" },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Reset username availability check when username changes
    if (e.target.name === "username") {
      setUsernameAvailable(null);
    }
  };

  const handleUsernameBlur = async () => {
    if (!formData.username || formData.username.length < 3) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/check-username`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
        }),
      });

      const data = await response.json();
      setUsernameAvailable(data.available);
      
      if (!data.available) {
        setToastMessage(data.message || "Username already taken");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error checking username:", error);
    }
  };

  const handleRoleChange = (role: "user" | "business") => {
    setFormData({
      ...formData,
      role,
    });
  };

  const handleAvatarSelect = (avatarId: string) => {
    setFormData({
      ...formData,
      avatar: avatarId,
    });
  };

  const handleOtpChange = (value: string) => {
    setFormData({
      ...formData,
      otp: value,
    });
    // Reset verification status when OTP changes
    if (isOtpVerified) {
      setIsOtpVerified(false);
    }
  };

  const handleSendOtp = async () => {
    if (!formData.phoneNumber) {
      setToastMessage("Please enter a phone number first");
      setShowToast(true);
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch(`/api/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setToastMessage(data.error || "Failed to send OTP");
        setShowToast(true);
        setIsSendingOtp(false);
        return;
      }

      // Store OTP for verification (only in dev mode)
      if (data.otp) {
        setGeneratedOtp(data.otp);
      }
      setIsOtpVerified(false);
      setFormData({ ...formData, otp: "" }); // Clear previous OTP
      
      // Show OTP in toast (only in dev)
      if (data.otp) {
        setToastMessage(`Your OTP is: ${data.otp}`);
      } else {
        setToastMessage("OTP sent successfully! Check your phone.");
      }
      setShowToast(true);
      setIsSendingOtp(false);
    } catch (error) {
      console.error("Error sending OTP:", error);
      setToastMessage("Failed to send OTP. Please try again.");
      setShowToast(true);
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.phoneNumber || !formData.otp) {
      setToastMessage("Please send and enter OTP first");
      setShowToast(true);
      return;
    }

    if (formData.otp.length !== 6) {
      setToastMessage("Please enter complete OTP");
      setShowToast(true);
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch(`/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber,
          otpCode: formData.otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setToastMessage(data.error || "Invalid OTP. Please try again.");
        setShowToast(true);
        setIsOtpVerified(false);
        setIsVerifyingOtp(false);
        return;
      }

      setIsOtpVerified(true);
      setToastMessage("OTP verified successfully!");
      setShowToast(true);
      setIsVerifyingOtp(false);
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setToastMessage("Failed to verify OTP. Please try again.");
      setShowToast(true);
      setIsOtpVerified(false);
      setIsVerifyingOtp(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/google";
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1 fields
      if (!formData.firstName || !formData.lastName || !formData.phoneNumber) {
        setToastMessage("Please fill in all fields");
        setShowToast(true);
        return;
      }
      if (!isOtpVerified) {
        setToastMessage("Please verify your phone number with OTP first");
        setShowToast(true);
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate step 2 fields
      if (!formData.password || !formData.confirmPassword) {
        setToastMessage("Please fill in both password fields");
        setShowToast(true);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setToastMessage("Passwords do not match");
        setShowToast(true);
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate step 3 fields
    if (!formData.username) {
      setToastMessage("Please enter a username");
      setShowToast(true);
      return;
    }

    if (!formData.avatar) {
      setToastMessage("Please select an avatar");
      setShowToast(true);
      return;
    }

    // Check if username is available
    if (usernameAvailable === false) {
      setToastMessage("Username is already taken. Please choose another.");
      setShowToast(true);
      return;
    }

    setIsLoading(true);
    try {
      // Check username availability first (double check)
      const usernameCheck = await fetch(`/api/auth/check-username`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
        }),
      });

      const usernameData = await usernameCheck.json();

      if (!usernameData.available) {
        setToastMessage(usernameData.message || "Username already taken");
        setShowToast(true);
        setIsLoading(false);
        return;
      }

      // Complete registration
      const response = await fetch(`/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
          role: formData.role,
          avatar: formData.avatar,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setToastMessage(data.error || "Registration failed");
        setShowToast(true);
        setIsLoading(false);
        return;
      }

      // Store session in localStorage
      if (data.session) {
        localStorage.setItem("sessionId", data.session.sessionId);
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Redirect to home page with success parameter
      router.push("/?registered=true");
    } catch (error) {
      console.error("Error during registration:", error);
      setToastMessage("Registration failed. Please try again.");
      setShowToast(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
          duration={5000}
        />
      )}
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <Zap className="h-8 w-8" />
          <span className="text-2xl font-bold">Hypercaller</span>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Create an account</CardTitle>
            <CardDescription className="text-center">
              {currentStep === 1 && "Enter your personal information"}
              {currentStep === 2 && "Set up your password"}
              {currentStep === 3 && "Complete your profile"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="mb-6">
              <Progress currentStep={currentStep} totalSteps={3} />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1: Personal Info & Phone Verification */}
              {currentStep === 1 && (
                <>
              <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium">
                      First Name
                </label>
                <Input
                      id="firstName"
                      name="firstName"
                  type="text"
                      placeholder="John"
                      value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      Last Name
                </label>
                <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
                  <div className="space-y-2">
                    <label htmlFor="phoneNumber" className="text-sm font-medium">
                      Phone Number
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        required
                        className="flex-1"
                      />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendOtp}
                    disabled={!formData.phoneNumber || isSendingOtp}
                  >
                    {isSendingOtp ? "Sending..." : "Send OTP"}
                  </Button>
                    </div>
                  </div>
                  {generatedOtp && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium block text-center">
                        Enter OTP
                      </label>
                      <OTPInput
                        value={formData.otp}
                        onChange={handleOtpChange}
                        length={6}
                      />
                      <div className="flex justify-center">
                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={formData.otp.length !== 6 || isOtpVerified || isVerifyingOtp}
                        className="w-full sm:w-auto"
                      >
                        {isVerifyingOtp ? "Verifying..." : isOtpVerified ? "✓ OTP Verified" : "Verify OTP"}
                      </Button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!isOtpVerified}
                      size="lg"
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {/* Step 2: Password Setup */}
              {currentStep === 2 && (
                <>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      size="lg"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNext}
                      size="lg"
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {/* Step 3: Profile Setup */}
              {currentStep === 3 && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium">
                      Username
                    </label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="johndoe"
                      value={formData.username}
                      onChange={handleChange}
                      onBlur={handleUsernameBlur}
                      required
                    />
                    {usernameAvailable === false && (
                      <p className="text-sm text-red-600">Username already taken</p>
                    )}
                    {usernameAvailable === true && (
                      <p className="text-sm text-green-600">Username available</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Role
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value="user"
                          checked={formData.role === "user"}
                          onChange={() => handleRoleChange("user")}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">User</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value="business"
                          checked={formData.role === "business"}
                          onChange={() => handleRoleChange("business")}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Business</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Select Avatar
                    </label>
                    <div className="flex gap-3 justify-center">
                      {avatars.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => handleAvatarSelect(avatar.id)}
                          className={`
                            w-16 h-16 rounded-full border-2 flex items-center justify-center text-3xl
                            transition-all hover:scale-110
                            ${formData.avatar === avatar.id
                              ? "border-foreground bg-accent"
                              : "border-border hover:border-foreground/50"
                            }
                          `}
                        >
                          {avatar.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      size="lg"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    <Button type="submit" size="lg" disabled={isLoading}>
                      {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
                  </div>
                </>
              )}
            </form>
            <div className="relative mb-4 mt-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4"
              onClick={handleGoogleSignIn}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign up with Google
            </Button>
            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login" className="hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Zap className="h-8 w-8 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}

