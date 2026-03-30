import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mic, Brain, FolderOpen, Search, Globe, Cloud, Shield, Lightbulb, GraduationCap, Briefcase, PenTool } from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-serif text-xl font-bold text-gradient">ThoughtSpark</span>
          <Link to="/app">
            <Button variant="ghost" size="sm">Open App</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute bottom-0 -right-32 w-80 h-80 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "3s" }} />

        <div className="relative max-w-3xl mx-auto text-center space-y-8">
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight tracking-tight">
            Capture Ideas{" "}
            <span className="text-gradient">Instantly</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Record your thoughts, let AI organize them, and build a searchable library of everything that matters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer">
              <Button variant="hero" size="xl" className="min-w-[220px]">
                Download for iOS
              </Button>
            </a>
            <Link to="/app">
              <Button variant="outline" size="lg">Try in Browser</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-center mb-16">
            Everything you need to <span className="text-gradient">think better</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Mic, title: "Voice Recording", desc: "Tap and talk. Capture ideas in seconds with high-quality audio recording." },
              { icon: Brain, title: "AI Summaries", desc: "Automatic transcription, smart summaries, and category tagging powered by AI." },
              { icon: FolderOpen, title: "Smart Organization", desc: "Folders, search, and filters keep your library organized as it grows." },
            ].map((f, i) => (
              <div
                key={f.title}
                className="glass-card rounded-2xl p-8 text-center space-y-4 hover:shadow-medium transition-shadow duration-300"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
                  <f.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-xl font-semibold">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-16">
            How it <span className="text-gradient">works</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-12 items-start">
            {[
              { step: "1", title: "Record", desc: "Hit record and speak your mind. Ideas, notes, reflections — anything." },
              { step: "2", title: "AI Processes", desc: "Your memo is transcribed, summarized, and categorized automatically." },
              { step: "3", title: "Organized Library", desc: "Browse, search, and revisit your thoughts anytime in your personal library." },
            ].map((s) => (
              <div key={s.step} className="space-y-4">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mx-auto text-primary-foreground font-bold text-lg">
                  {s.step}
                </div>
                <h3 className="font-serif text-xl font-semibold">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Perfect For */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-16">
            Perfect for <span className="text-gradient">everyone</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Lightbulb, title: "Thinkers", desc: "Capture shower thoughts before they vanish" },
              { icon: GraduationCap, title: "Students", desc: "Record lectures and study notes on the go" },
              { icon: Briefcase, title: "Professionals", desc: "Log meeting takeaways and action items" },
              { icon: PenTool, title: "Creatives", desc: "Save story ideas, lyrics, and inspiration" },
            ].map((a) => (
              <div key={a.title} className="glass-card rounded-xl p-6 space-y-3 text-center hover:shadow-medium transition-shadow duration-300">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <a.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm text-muted-foreground">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="font-serif text-3xl md:text-5xl font-bold">
            Start capturing your <span className="text-gradient">best ideas</span>
          </h2>
          <p className="text-lg text-muted-foreground">Free to download. Your thoughts deserve a home.</p>
          <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer">
            <Button variant="hero" size="xl" className="min-w-[220px]">
              Download for iOS
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="font-serif font-semibold text-foreground">ThoughtSpark</span>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
          <span>© {new Date().getFullYear()} ThoughtSpark</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
