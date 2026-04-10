import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import appIcon from "@/assets/app-icon.png";

const SupportPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <img src={appIcon} alt="ThoughtSpark" className="w-20 h-20 mx-auto rounded-[1.25rem] shadow-lg" />
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto">
            Have a question, issue, or feedback? We'd love to hear from you.
          </p>

          <div className="bg-card border border-border rounded-2xl p-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Email Us</h2>
            <p className="text-muted-foreground">
              Reach out and we'll get back to you as soon as possible.
            </p>
            <a href="mailto:ruslans@milinex.digital">
              <Button variant="gradient" size="lg" className="mt-2">
                <Mail className="w-4 h-4 mr-2" />
                ruslans@milinex.digital
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SupportPage;
