import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isInApp = location.pathname.startsWith("/app/");

  const handleBack = () => {
    // Prefer a natural back behavior; fall back to app shell or landing.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isInApp ? "/app" : "/");
    }
  };

  return (
    <div
      className="container mx-auto px-4 pb-10"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
    >
      <Button variant="ghost" size="sm" className="mb-4" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <PageHeader title="Privacy Policy" subtitle="How we collect and use information" />

      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-display font-semibold text-lg text-foreground">1. Information We Collect</h2>
            <p className="text-sm text-muted-foreground">
              When you use ThoughtSpark, we collect the following types of information:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              <li><span className="font-medium text-foreground">Account Information:</span> Email address and profile information.</li>
              <li><span className="font-medium text-foreground">Audio Recordings:</span> Voice memos you record and store within the app.</li>
              <li><span className="font-medium text-foreground">Usage Data:</span> How you use our service, including features accessed and time spent.</li>
              <li><span className="font-medium text-foreground">Device Information:</span> Device identifiers and basic device/OS information.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-semibold text-lg text-foreground">2. How We Use Your Information</h2>
            <p className="text-sm text-muted-foreground">We use the information we collect to:</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and transcribe your voice memos</li>
              <li>Generate summaries and insights from your recordings</li>
              <li>Send you updates and notifications (with your consent)</li>
              <li>Respond to requests and provide customer support</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-semibold text-lg text-foreground">3. Data Sharing</h2>
            <p className="text-sm text-muted-foreground">
              We do not sell your personal information. We may share information with service providers or when required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-semibold text-lg text-foreground">4. Data Security</h2>
            <p className="text-sm text-muted-foreground">
              We implement reasonable security measures to protect your information against unauthorized access, alteration,
              disclosure, or destruction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-semibold text-lg text-foreground">5. Your Rights</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              <li>Access and download your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Request data portability</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-semibold text-lg text-foreground">6. Cookies and Tracking</h2>
            <p className="text-sm text-muted-foreground">
              We use cookies and similar technologies to maintain your session and remember preferences. You can manage cookie
              preferences in your browser settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-semibold text-lg text-foreground">7. Children&apos;s Privacy</h2>
            <p className="text-sm text-muted-foreground">
              Our service is not intended for children under 13. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-semibold text-lg text-foreground">8. Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground">
              We may update this policy from time to time by posting an updated version and revising the “Last updated” date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-semibold text-lg text-foreground">9. Contact Us</h2>
            <p className="text-sm text-muted-foreground">
              For support, please visit{" "}
              <a
                href="https://thoughtspark.app/support"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                thoughtspark.app/support
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
