import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brain, Repeat, MessageCircle, CheckCircle } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <span className="font-semibold text-xl">Colqad</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing">
              <Button variant="ghost">Pricing</Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Master Mathematics
            <br />
            <span className="text-primary">Through Problems</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Colqad combines spaced repetition with an AI tutor to help you truly
            understand math concepts. Practice problems surface at the right time,
            and when you&apos;re stuck, our AI explains rather than just giving answers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto">
                Join Early Access
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How Colqad Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built on proven learning science principles to maximize retention and understanding.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Repeat className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Spaced Repetition</h3>
              <p className="text-muted-foreground">
                Problems resurface at optimal intervals based on your performance.
                Mastered concepts are reviewed less frequently, while challenging
                ones appear more often.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Tutor</h3>
              <p className="text-muted-foreground">
                Stuck on a problem? Our AI tutor guides you toward understanding
                with Socratic questions and conceptual explanations, not just
                answers.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Active Recall</h3>
              <p className="text-muted-foreground">
                Every review session requires solving problems from memory before
                seeing solutions. This strengthens neural pathways and improves
                long-term retention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Topics Preview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Comprehensive Coverage</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From calculus to linear algebra, statistics to real analysis —
              we&apos;ve got you covered.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              "Calculus",
              "Linear Algebra",
              "Statistics",
              "Discrete Mathematics",
              "Real Analysis",
              "Probability",
              "Differential Equations",
              "Number Theory",
            ].map((topic) => (
              <div
                key={topic}
                className="flex items-center gap-2 p-4 bg-card rounded-lg border"
              >
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">{topic}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Master Mathematics?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join our early access program and be among the first to experience
            the future of math learning.
          </p>
          <Link href="/sign-up">
            <Button size="lg" variant="secondary">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>&copy; 2026 Colqad. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
