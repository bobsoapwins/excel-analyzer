
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onAccept }) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleAccept = () => {
    if (isChecked) {
      onAccept();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { /* Modal cannot be dismissed by clicking outside */ }}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Terms of Service</DialogTitle>
          <DialogDescription>
            Please read and accept our terms and conditions to use this service.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow my-4 pr-6 max-h-[50vh] overflow-y-auto">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="mb-2">Last updated: July 26, 2024</p>
            <p className="mb-2">
              Welcome to Excel Insights (&quot;Service&quot;), operated by Neo Incorporated (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;).
              These Terms of Service (&quot;Terms&quot;) govern your use of our Service. By accessing or using the Service,
              you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not
              access the Service.
            </p>
            <h3 className="text-lg font-semibold mt-4 mb-2">1. Use of Service</h3>
            <p className="mb-2">
              Our Service allows you to upload Excel spreadsheets for data analysis. You are responsible for the
              data you upload and must ensure you have the necessary rights to use and process this data.
              You agree not to use the Service for any unlawful purpose or in any way that could damage, disable,
              overburden, or impair the Service.
            </p>
            <h3 className="text-lg font-semibold mt-4 mb-2">2. Data Privacy and Security</h3>
            <p className="mb-2">
              We are committed to protecting your data. Uploaded files are processed for analysis and are not
              stored longer than necessary to provide the Service. We do not share your data with third parties
              unless required by law. While we strive to use commercially acceptable means to protect your
              Personal Information, we cannot guarantee its absolute security.
            </p>
            <h3 className="text-lg font-semibold mt-4 mb-2">3. Intellectual Property</h3>
            <p className="mb-2">
              The Service and its original content (excluding Content provided by users), features, and
              functionality are and will remain the exclusive property of Neo Incorporated and its licensors.
              The Service is protected by copyright, trademark, and other laws of both the United States and
              foreign countries.
            </p>
            <h3 className="text-lg font-semibold mt-4 mb-2">4. Limitation of Liability</h3>
            <p className="mb-2">
              In no event shall Neo Incorporated, nor its directors, employees, partners, agents, suppliers,
              or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages,
              including without limitation, loss of profits, data, use, goodwill, or other intangible losses,
              resulting from (i) your access to or use of or inability to access or use the Service; (ii) any
              conduct or content of any third party on the Service; (iii) any content obtained from the Service;
              and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on
              warranty, contract, tort (including negligence) or any other legal theory, whether or not we have
              been informed of the possibility of such damage, and even if a remedy set forth herein is found
              to have failed of its essential purpose. The insights provided are for informational purposes only
              and should not be considered as professional financial or business advice.
            </p>
            <h3 className="text-lg font-semibold mt-4 mb-2">5. Changes to Terms</h3>
            <p className="mb-2">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
              If a revision is material we will try to provide at least 30 days&apos; notice prior to any new terms
              taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
            <h3 className="text-lg font-semibold mt-4 mb-2">6. Governing Law</h3>
            <p className="mb-2">
              These Terms shall be governed and construed in accordance with the laws of the State of Delaware,
              United States, without regard to its conflict of law provisions.
            </p>
            <h3 className="text-lg font-semibold mt-4 mb-2">7. Contact Us</h3>
            <p>
              If you have any questions about these Terms, please contact us at support@neoincorporated.dev.
            </p>
          </div>
        </ScrollArea>
        <DialogFooter className="flex-col sm:flex-row gap-2 items-center pt-4 border-t mt-auto">
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" checked={isChecked} onCheckedChange={(checked) => setIsChecked(checked as boolean)} />
            <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I have read and agree to the Terms of Service.
            </Label>
          </div>
          <Button onClick={handleAccept} disabled={!isChecked} className="w-full sm:w-auto">
            Accept and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsOfServiceModal;
