"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import {
  Check,
  Zap,
  Sparkles,
  Building2,
  Shield,
  Headphones,
  Rocket,
  Star,
  ArrowRight,
  Database,
} from "lucide-react";

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for individuals exploring business discovery",
    features: [
      "10 AI-powered searches per month",
      "Basic business profiles",
      "Standard search results",
      "Community support",
      "Mobile app access",
    ],
    cta: "Get started",
    popular: false,
    icon: Sparkles,
    color: "from-gray-500 to-gray-600",
    iconBg: "bg-gradient-to-br from-gray-500 to-gray-600",
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For professionals who need advanced discovery tools",
    features: [
      "Unlimited AI-powered searches",
      "Enhanced business profiles",
      "Priority AI ranking",
      "Advanced filters & sorting",
      "Email support",
      "Save unlimited searches",
      "Export search results",
      "Ad-free experience",
    ],
    cta: "Start free trial",
    popular: true,
    icon: Rocket,
    color: "from-violet-500 to-cyan-500",
    iconBg: "bg-gradient-to-br from-violet-500 to-cyan-500",
  },
  {
    name: "Business",
    price: "$99",
    period: "per month",
    description: "For teams and businesses seeking premium visibility",
    features: [
      "Everything in Pro",
      "Business profile verification",
      "Premium placement in search",
      "Analytics dashboard",
      "API access",
      "Priority support",
      "Custom branding",
      "Team collaboration tools",
      "Dedicated account manager",
    ],
    cta: "Contact sales",
    popular: false,
    icon: Building2,
    color: "from-rose-500 to-violet-500",
    iconBg: "bg-gradient-to-br from-rose-500 to-violet-500",
  },
];

const features = [
  {
    title: "AI-Powered Discovery",
    description: "Advanced AI algorithms to find the perfect business matches",
    icon: Sparkles,
    color: "from-violet-500 to-cyan-500",
  },
  {
    title: "Verified Businesses",
    description: "Only verified and trusted businesses in our network",
    icon: Shield,
    color: "from-cyan-500 to-rose-500",
  },
  {
    title: "24/7 Support",
    description: "Round-the-clock customer support whenever you need help",
    icon: Headphones,
    color: "from-rose-500 to-violet-500",
  },
  {
    title: "Global Coverage",
    description: "Access to millions of businesses worldwide",
    icon: Database,
    color: "from-violet-500 to-rose-500",
  },
];

const faqs = [
  {
    question: "Can I change plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and bank transfers for Business plans. All payments are secure and encrypted.",
  },
  {
    question: "Is there a free trial?",
    answer: "Yes, our Pro plan comes with a 14-day free trial. No credit card required to start. Cancel anytime during the trial.",
  },
  {
    question: "Do you offer discounts for annual plans?",
    answer: "Yes! Save up to 20% when you choose annual billing. Contact our sales team for more details on annual pricing.",
  },
];

export default function PricingPage() {
  const [mounted, setMounted] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    setMounted(true);
  }, []);

  const getPrice = (price: string) => {
    if (price === "$0") return price;
    const numPrice = parseInt(price.replace("$", ""));
    if (billingCycle === "annual") {
      const annualPrice = Math.round(numPrice * 12 * 0.8); // 20% discount
      return `$${annualPrice}`;
    }
    return price;
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
          {/* Header Section */}
          <div className={`mx-auto max-w-4xl text-center mb-16 ${mounted ? "animate-slide-up" : "opacity-0"}`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Star className="h-3.5 w-3.5" />
              Simple, transparent pricing
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
              Choose your <span className="gradient-text">plan</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8">
              Flexible pricing plans designed to scale with your needs. Start free, upgrade when you're ready.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 p-1 rounded-full border border-border/60 bg-muted/30">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all relative ${
                  billingCycle === "annual"
                    ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className={`mx-auto max-w-7xl grid md:grid-cols-3 gap-6 mb-20 ${mounted ? "animate-slide-up stagger-1" : "opacity-0"}`}>
            {pricingTiers.map((tier, index) => (
              <Card
                key={tier.name}
                className={`relative overflow-hidden border-0 bg-card/80 backdrop-blur-xl shadow-2xl shadow-foreground/5 ${
                  tier.popular ? "md:scale-105 md:-translate-y-2 ring-2 ring-primary/50" : ""
                } ${mounted ? `animate-slide-up stagger-${index + 1}` : "opacity-0"}`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-xs font-semibold px-4 py-1.5 rounded-bl-xl">
                    Most Popular
                  </div>
                )}

                <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-5`} />

                <CardHeader className="relative pb-4">
                  <div className="mb-4">
                    <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${tier.iconBg} shadow-lg mb-4`}>
                      <tier.icon className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl mb-2">{tier.name}</CardTitle>
                  <CardDescription className="text-base">{tier.description}</CardDescription>
                  <div className="mt-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{getPrice(tier.price)}</span>
                      {tier.price !== "$0" && (
                        <span className="text-muted-foreground">
                          /{billingCycle === "annual" ? "year" : tier.period.replace("per ", "")}
                        </span>
                      )}
                    </div>
                    {billingCycle === "annual" && tier.price !== "$0" && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {tier.price} per month billed annually
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="relative space-y-6">
                  <Button
                    className={`w-full h-11 ${
                      tier.popular
                        ? "bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-violet-500/25"
                        : ""
                    }`}
                    variant={tier.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href={tier.name === "Business" ? "/contact" : "/register"}>
                      {tier.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <div className="space-y-3">
                    {tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Features Section */}
          <div className={`mx-auto max-w-6xl mb-20 ${mounted ? "animate-slide-up stagger-4" : "opacity-0"}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Included in every <span className="gradient-text">plan</span>
              </h2>
              <p className="text-lg text-muted-foreground">Powerful features that help you discover and connect</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={feature.title} className="border-0 bg-card/70 backdrop-blur-xl shadow-xl shadow-foreground/5 card-hover">
                  <CardContent className="p-6">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className={`mx-auto max-w-3xl ${mounted ? "animate-slide-up stagger-5" : "opacity-0"}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Frequently asked <span className="gradient-text">questions</span>
              </h2>
              <p className="text-lg text-muted-foreground">Everything you need to know about our pricing</p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="border-0 bg-card/70 backdrop-blur-xl shadow-xl shadow-foreground/5">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className={`mt-20 mx-auto max-w-4xl ${mounted ? "animate-slide-up stagger-5" : "opacity-0"}`}>
            <Card className="relative overflow-hidden border-0 bg-card/80 backdrop-blur-xl">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-violet-500 via-cyan-500 to-rose-500 opacity-20 blur-xl" />
              <div className="absolute inset-[1px] rounded-3xl bg-card" />

              <CardContent className="relative p-8 sm:p-12 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                  <Zap className="h-3.5 w-3.5" />
                  Still have questions?
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Let's talk about your needs
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Our team is here to help you find the perfect plan for your business discovery needs.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button size="lg" className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-violet-500/25 h-12 px-8" asChild>
                    <Link href="/contact">
                      Contact us
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                    <Link href="/register">Start free trial</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

