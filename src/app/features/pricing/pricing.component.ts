import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PlanType } from '../../core/models/plan.model';

interface PricingPlan {
  id: PlanType;
  name: string;
  price: number;
  description: string;
  popular?: boolean;
  features: string[];
  maxUsers?: number | null;
  buttonText: string;
  buttonColor: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatToolbarModule,
  ],
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss'],
})
export class PricingComponent implements OnInit {
  // WhatsApp configuration
  whatsappPhoneNumber = '971589003150'; // +971-589003150 without special characters
  whatsappMessage = 'Hello! I am interested in learning more about SelfAccounting.AI pricing and would like to speak with your sales team.';
  whatsappLink = `https://wa.me/${this.whatsappPhoneNumber}?text=${encodeURIComponent(this.whatsappMessage)}`;

  plans: PricingPlan[] = [
    {
      id: 'standard',
      name: 'Standard',
      price: 99,
      description: 'Perfect for small businesses focusing on sales management',
      features: [
        'Sales Module - Full Access',
        'Customer Management',
        'Sales Invoices',
        'Payment Tracking',
        'Credit Notes & Debit Notes',
        'Invoice Templates',
        'Basic Reporting',
        'Up to 5 Users',
        'Email Support',
      ],
      maxUsers: 5,
      buttonText: 'Get Started',
      buttonColor: 'primary',
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 399,
      description: 'Complete solution for growing businesses',
      popular: true,
      features: [
        'Everything in Standard',
        'All Modules Enabled',
        'Expense Management',
        'Banking & Accounts',
        'Advanced Reports',
        'VAT Compliance',
        'Multi-Currency Support',
        'Vendor Management',
        'Journal Entries',
        'Up to 15 Users',
        'Priority Support',
        'Note: Upload Expense feature disabled',
      ],
      maxUsers: 15,
      buttonText: 'Get Started',
      buttonColor: 'accent',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 599,
      description: 'Full-featured solution with all capabilities',
      features: [
        'Everything in Premium',
        'Upload Expense Feature',
        'Employee Expense Submission',
        'Bank Reconciliation',
        'Automated Notifications',
        'AI-Powered OCR Receipt Scanning',
        'Smart Category Detection',
        'Unlimited Users',
        'Custom Storage Quota',
        '24/7 Priority Support',
        'Dedicated Account Manager',
        'Custom Integrations',
      ],
      maxUsers: null, // Unlimited
      buttonText: 'Contact Sales',
      buttonColor: 'primary',
    },
  ];


  private readonly document = inject(DOCUMENT);

  constructor(
    private router: Router,
    private titleService: Title,
    private metaService: Meta,
  ) {}

  ngOnInit(): void {
    this.setSEOMetaTags();
    this.addStructuredData();
  }

  private addStructuredData(): void {
    const offerData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'SelfAccounting.AI',
      description:
        'Self accounting software for UAE businesses, offered as Standard, Premium, and Enterprise plans.',
      brand: {
        '@type': 'Brand',
        name: 'SelfAccounting.AI',
      },
      offers: this.plans.map((plan) => ({
        '@type': 'Offer',
        name: `${plan.name} Plan`,
        description: plan.description,
        price: plan.price,
        priceCurrency: 'AED',
        priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
        availability: 'https://schema.org/InStock',
        url: 'https://selfaccounting.ai/pricing',
      })),
    };

    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(offerData);
    this.document.head.appendChild(script);
  }

  private setSEOMetaTags(): void {
    const title =
      'Pricing - SelfAccounting.AI | Self Accounting Software Plans for UAE Businesses';
    const description =
      'Compare SelfAccounting.AI pricing plans for UAE businesses: Standard, Premium, and Enterprise. Transparent monthly pricing for expense tracking, sales invoicing, AI-powered OCR receipt scanning, and VAT-compliant accounting.';
    const url = 'https://selfaccounting.ai/pricing';

    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({
      name: 'keywords',
      content:
        'self accounting pricing, accounting software pricing UAE, invoicing software pricing, expense tracker pricing, VAT software cost UAE',
    });
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({
      property: 'og:description',
      content: description,
    });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({
      name: 'twitter:description',
      content: description,
    });
  }

  navigateToRegister(planType?: PlanType): void {
    this.router.navigate(['/auth/register'], planType ? { queryParams: { plan: planType } } : {});
  }

  openWhatsApp(): void {
    window.open(this.whatsappLink, '_blank');
  }

  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}

