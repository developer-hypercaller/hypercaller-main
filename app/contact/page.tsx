"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { useToast } from "@/components/toast-provider";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Linkedin,
  Twitter,
  Github,
  Clock,
  Globe,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function ContactPage() {
  const { success, error } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  }>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.subject.trim()) {
      errors.subject = "Subject is required";
    }

    if (!formData.message.trim()) {
      errors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      error("Please fill in all required fields correctly");
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    // Simulate form submission (replace with actual API call)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      success("Your message has been sent successfully! We'll get back to you soon.");
      
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err) {
      setIsSubmitting(false);
      error("Failed to send message. Please try again.");
    }
  };

  return (
    <div className="min-h-screen mesh-gradient noise-overlay relative overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="glow-orb w-[600px] h-[600px] bg-violet-500/30 top-[-200px] left-[-100px] animate-float" />
        <div className="glow-orb w-[500px] h-[500px] bg-cyan-500/20 top-[30%] right-[-150px] animate-float-delayed" />
        <div className="glow-orb w-[400px] h-[400px] bg-rose-500/20 bottom-[-100px] left-[20%] animate-pulse-glow" />
      </div>

      <div className="pointer-events-none fixed inset-0 dot-pattern opacity-60" />

      <AppHeader />

      {/* Main Content */}
      <main className="relative pt-32 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {/* Header Section */}
            <div className={`text-center mb-16 ${mounted ? "animate-slide-up" : "opacity-0"}`}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                <MessageSquare className="h-3.5 w-3.5" />
                Get in touch
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
                Contact <span className="gradient-text">us</span>
              </h1>
              <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Have a question or want to learn more? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>
            </div>

            {/* Stats/Trust Indicators */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16 ${mounted ? "animate-slide-up stagger-1" : "opacity-0"}`}>
              <Card className="border-0 bg-card/60 backdrop-blur-xl text-center p-4 sm:p-5 card-hover">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-lg">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">24/7</div>
                  <div className="text-xs text-muted-foreground">Support</div>
                </div>
              </Card>
              <Card className="border-0 bg-card/60 backdrop-blur-xl text-center p-4 sm:p-5 card-hover">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-rose-500 text-white shadow-lg">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">&lt;24h</div>
                  <div className="text-xs text-muted-foreground">Response</div>
                </div>
              </Card>
              <Card className="border-0 bg-card/60 backdrop-blur-xl text-center p-4 sm:p-5 card-hover">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-violet-500 text-white shadow-lg">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">100+</div>
                  <div className="text-xs text-muted-foreground">Countries</div>
                </div>
              </Card>
              <Card className="border-0 bg-card/60 backdrop-blur-xl text-center p-4 sm:p-5 card-hover">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-rose-500 text-white shadow-lg">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">10K+</div>
                  <div className="text-xs text-muted-foreground">Messages</div>
                </div>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Contact Form */}
              <Card className={`relative border-0 bg-card/80 shadow-2xl shadow-foreground/5 backdrop-blur-xl overflow-hidden ${mounted ? "animate-slide-up stagger-2" : "opacity-0"}`}>
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-violet-500 via-cyan-500 to-rose-500 opacity-20 blur-xl" />
                <div className="absolute inset-[1px] rounded-3xl bg-card" />

                <CardHeader className="relative pb-6">
                  <div className="flex items-start sm:items-center gap-3 mb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex-shrink-0 shadow-lg">
                      <Send className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl sm:text-2xl">Send us a message</CardTitle>
                      <CardDescription className="mt-1 text-sm">Fill out the form below and we'll get back to you</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="relative px-6 pt-0 !pb-0">
                  {submitted && (
                    <div className="mb-6 flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-slide-up">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-sm text-green-800 dark:text-green-200">Thank you! Your message has been sent successfully.</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={handleChange}
                          className={`w-full ${formErrors.name ? "border-destructive focus-visible:border-destructive" : ""}`}
                        />
                        {formErrors.name && (
                          <div className="flex items-center gap-2 text-sm text-destructive animate-slide-up">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{formErrors.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                          Email <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full ${formErrors.email ? "border-destructive focus-visible:border-destructive" : ""}`}
                        />
                        {formErrors.email && (
                          <div className="flex items-center gap-2 text-sm text-destructive animate-slide-up">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{formErrors.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium">
                        Subject <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        placeholder="How can we help?"
                        value={formData.subject}
                        onChange={handleChange}
                        className={`w-full ${formErrors.subject ? "border-destructive focus-visible:border-destructive" : ""}`}
                      />
                      {formErrors.subject && (
                        <div className="flex items-center gap-2 text-sm text-destructive animate-slide-up">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{formErrors.subject}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">
                        Message <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={6}
                        placeholder="Tell us more about your inquiry..."
                        value={formData.message}
                        onChange={handleChange}
                        className={`flex w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${
                          formErrors.message
                            ? "border-destructive focus-visible:border-destructive bg-background"
                            : "border-input/50 bg-background focus-visible:border-primary/30"
                        }`}
                      />
                      {formErrors.message && (
                        <div className="flex items-center gap-2 text-sm text-destructive animate-slide-up">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{formErrors.message}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-violet-500/25 h-11"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <div className={`space-y-4 lg:space-y-6 ${mounted ? "animate-slide-up stagger-3" : "opacity-0"}`}>
                <Card className="border-0 bg-card/70 backdrop-blur-xl shadow-xl shadow-foreground/5">
                  <CardHeader>
                    <CardTitle className="text-2xl">Contact information</CardTitle>
                    <CardDescription>Reach out to us through these channels</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-start gap-4 p-5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-all card-hover cursor-pointer group">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Email</h3>
                        <a href="mailto:support@hypercaller.com" className="text-sm text-muted-foreground hover:text-primary transition-colors break-all">
                          support@hypercaller.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-all card-hover cursor-pointer group">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-rose-500 text-white flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Phone</h3>
                        <a href="tel:+1234567890" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                          +1 (234) 567-890
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-all card-hover cursor-pointer group">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-violet-500 text-white flex-shrink-0 group-hover:scale-110 transition-transform">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Address</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          123 Business Street<br />
                          Suite 100<br />
                          San Francisco, CA 94105
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-card/70 backdrop-blur-xl shadow-xl shadow-foreground/5">
                  <CardHeader>
                    <CardTitle className="text-xl">Follow us</CardTitle>
                    <CardDescription>Connect with us on social media</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" asChild>
                        <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                          <Twitter className="h-5 w-5" />
                        </a>
                      </Button>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" asChild>
                        <a href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                          <Linkedin className="h-5 w-5" />
                        </a>
                      </Button>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" asChild>
                        <a href="#" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                          <Github className="h-5 w-5" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-violet-500/10 via-cyan-500/10 to-rose-500/10 backdrop-blur-xl border border-primary/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-cyan-500/5 to-rose-500/5" />
                  <CardContent className="p-6 relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">Business hours</h3>
                    </div>
                    <div className="space-y-2.5 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                        <span className="font-medium">Monday - Friday</span>
                        <span>9:00 AM - 6:00 PM PST</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                        <span className="font-medium">Saturday</span>
                        <span>10:00 AM - 4:00 PM PST</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                        <span className="font-medium">Sunday</span>
                        <span className="text-muted-foreground/70">Closed</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

