import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
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


  constructor(private router: Router) {}

  ngOnInit(): void {}

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

