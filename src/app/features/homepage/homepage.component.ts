import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContactService } from '../../core/services/contact.service';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatGridListModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss'],
})
export class HomepageComponent implements OnInit {
  private readonly document = inject(DOCUMENT);
  currentYear = new Date().getFullYear();
  contactForm: FormGroup;
  submitting = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private contactService: ContactService,
    private titleService: Title,
    private metaService: Meta,
  ) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      company: [''],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnInit(): void {
    this.setSEOMetaTags();
    this.addStructuredData();
  }

  private setSEOMetaTags(): void {
    const title = 'SelfAccounting.AI - AI-Powered Expense Tracker & Auditing Software for UAE';
    const description = 'Leading expense tracker and auditing software for UAE businesses. AI-powered OCR receipt scanning, VAT compliance, bank reconciliation, and automated financial reporting. Trusted by audit firms across UAE.';
    const keywords = 'expense tracker UAE, auditing software UAE, expense management UAE, VAT compliance UAE, receipt scanning UAE, bank reconciliation UAE, accounting software UAE, financial reporting UAE, audit software UAE, expense tracking app UAE, FTA compliance UAE, OCR receipt UAE, automated accounting UAE, multi-currency expense tracker UAE';
    const imageUrl = 'https://selfaccounting.ai/assets/images/app-logo.jpg';
    const siteUrl = 'https://selfaccounting.ai/';

    // Set title
    this.titleService.setTitle(title);

    // Update or create meta tags
    this.metaService.updateTag({ name: 'title', content: title });
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'keywords', content: keywords });
    
    // Open Graph tags
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: imageUrl });
    this.metaService.updateTag({ property: 'og:url', content: siteUrl });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    
    // Twitter Card tags
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });
  }

  private addStructuredData(): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'SelfAccounting.AI',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '150',
      },
      description: 'AI-powered expense tracker and auditing software for UAE businesses. Features OCR receipt scanning, VAT compliance, bank reconciliation, and automated financial reporting.',
      featureList: [
        'AI-Powered OCR Receipt Scanning',
        'VAT Compliance & Reporting',
        'Bank Reconciliation',
        'Multi-User & Role-Based Access',
        'Vendor Management',
        'Audit Trail & Compliance',
        'Real-Time Dashboards',
        'Automated Notifications',
      ],
      screenshot: 'https://selfaccounting.ai/assets/images/app-logo.jpg',
      softwareVersion: '1.0',
      releaseNotes: 'Comprehensive expense management solution for UAE businesses',
      provider: {
        '@type': 'Organization',
        name: 'SelfAccounting.AI',
        url: 'https://selfaccounting.ai',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'AE',
          addressRegion: 'UAE',
        },
      },
      areaServed: {
        '@type': 'Country',
        name: 'United Arab Emirates',
      },
      keywords: 'expense tracker, auditing software, VAT compliance, receipt scanning, UAE',
    };

    const organizationData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SelfAccounting.AI',
      url: 'https://selfaccounting.ai',
      logo: 'https://selfaccounting.ai/assets/images/app-logo.jpg',
      description: 'Leading provider of AI-powered expense tracking and auditing software for UAE businesses',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'AE',
        addressRegion: 'UAE',
      },
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        availableLanguage: 'English',
      },
    };

    // Add structured data to the document
    const script1 = this.document.createElement('script');
    script1.type = 'application/ld+json';
    script1.text = JSON.stringify(structuredData);
    this.document.head.appendChild(script1);

    const script2 = this.document.createElement('script');
    script2.type = 'application/ld+json';
    script2.text = JSON.stringify(organizationData);
    this.document.head.appendChild(script2);
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  features = [
    {
      icon: 'receipt_long',
      title: 'Smart OCR Receipt Scanning',
      description:
        'Upload receipts and invoices. Our AI-powered OCR automatically extracts vendor details, amounts, VAT, dates, and invoice numbers with high accuracy.',
    },
    {
      icon: 'account_balance',
      title: 'Bank Reconciliation',
      description:
        'Automatically reconcile expenses with bank statements. Upload bank statements and match transactions effortlessly.',
    },
    {
      icon: 'calculate',
      title: 'VAT Compliance & Reporting',
      description:
        'UAE VAT-ready with automatic VAT calculations, comprehensive reports, and export capabilities for FTA submissions.',
    },
    {
      icon: 'timeline',
      title: 'Accrual Lifecycle Management',
      description:
        'Track expenses from accrual to settlement with intelligent matching, tolerance controls, and automated reminders.',
    },
    {
      icon: 'people',
      title: 'Multi-User & Role-Based Access',
      description:
        'Support for Super Admin, Admin, Accountant, and Employee roles with granular permissions and tenant isolation.',
    },
    {
      icon: 'store',
      title: 'Vendor Management',
      description:
        'Maintain vendor database with TRN tracking, automatic linking, and expense history for better vendor management.',
    },
    {
      icon: 'category',
      title: 'Smart Category Detection',
      description:
        'AI-powered category suggestions based on vendor and receipt content. Customizable categories per organization.',
    },
    {
      icon: 'notification_important',
      title: 'Automated Notifications',
      description:
        'Get reminders for pending approvals, accrual settlements, and important expense updates via email.',
    },
    {
      icon: 'assessment',
      title: 'Comprehensive Reports',
      description:
        'Generate detailed financial reports, VAT summaries, and expense analytics. Export to PDF, Excel, or CSV formats.',
    },
    {
      icon: 'security',
      title: 'Audit Trail & Compliance',
      description:
        'Complete audit logs for all actions, ensuring compliance and traceability for audit purposes.',
    },
    {
      icon: 'cloud_upload',
      title: 'Secure Cloud Storage',
      description:
        'All receipts and documents stored securely in AWS S3 with signed URLs and encrypted access.',
    },
    {
      icon: 'dashboard',
      title: 'Real-Time Dashboards',
      description:
        'Interactive dashboards with charts and KPIs for expenses, VAT, accruals, and financial insights.',
    },
  ];

  benefits = [
    {
      title: 'Save Time',
      description: 'Reduce manual data entry by up to 90% with automated OCR processing.',
    },
    {
      title: 'Ensure Accuracy',
      description: 'Eliminate human errors with intelligent data extraction and validation.',
    },
    {
      title: 'Stay Compliant',
      description: 'UAE VAT-ready with automated calculations and FTA-compliant reporting.',
    },
    {
      title: 'Scale Easily',
      description: 'Multi-tenant architecture supports unlimited organizations and users.',
    },
  ];

  submitContactForm(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.snackBar.open('Please fill in all required fields correctly.', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.submitting = true;
    const formData = this.contactForm.getRawValue();

    this.contactService.submitContactForm(formData).subscribe({
      next: (response) => {
        this.snackBar.open(
          response.message || 'Thank you! We will contact you soon.',
          'Close',
          {
            duration: 5000,
          },
        );
        this.contactForm.reset();
        this.submitting = false;
      },
      error: (error) => {
        console.error('Contact form submission error:', error);
        this.snackBar.open(
          error?.error?.message || 'Error submitting form. Please try again.',
          'Close',
          {
            duration: 4000,
            panelClass: ['snack-error'],
          },
        );
        this.submitting = false;
      },
    });
  }
}

