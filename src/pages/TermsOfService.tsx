import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Terms of Service</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using MemoMuse, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p className="text-muted-foreground">
              MemoMuse is a voice memo application that allows users to record, transcribe, organize, 
              and share audio memos. Our service includes features such as:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Voice recording and playback</li>
              <li>Automatic transcription</li>
              <li>AI-powered summaries and insights</li>
              <li>Organization with folders and categories</li>
              <li>Sharing capabilities</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
            <p className="text-muted-foreground">
              To use certain features, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. User Content</h2>
            <p className="text-muted-foreground">
              You retain ownership of all content you create, including voice recordings and notes. 
              By using our service, you grant us a limited license to process your content solely 
              to provide the service (e.g., transcription, storage, AI processing).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the service for any illegal purpose</li>
              <li>Upload content that infringes on others' rights</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Use automated systems to access the service without permission</li>
              <li>Record conversations without proper consent where required by law</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Privacy</h2>
            <p className="text-muted-foreground">
              Your use of MemoMuse is also governed by our{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The MemoMuse service, including its design, features, and content (excluding user content), 
              is protected by copyright, trademark, and other intellectual property laws. You may not 
              copy, modify, or distribute any part of our service without permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Disclaimers</h2>
            <p className="text-muted-foreground">
              The service is provided "as is" without warranties of any kind. We do not guarantee that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>The service will be uninterrupted or error-free</li>
              <li>Transcriptions will be 100% accurate</li>
              <li>AI-generated summaries will be complete or accurate</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, MemoMuse shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages resulting from your use of the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account at any time for violations of these terms. 
              You may also delete your account at any time through the app settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. We will notify users of 
              significant changes. Continued use of the service after changes constitutes acceptance 
              of the new terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">12. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms of Service, please contact us through the app's 
              settings or support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
