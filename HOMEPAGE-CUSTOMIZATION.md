# Homepage Customization Guide

## Hardcoded Values to Review/Change

### 1. **App/Company Name** (Multiple Locations)
**Current:** "Smart Expense Tracker"

**Locations:**
- `homepage.component.html` line 5: Hero title
- `homepage.component.html` line 23: Section title
- `homepage.component.html` line 100: CTA subtitle
- `homepage.component.html` line 111: Footer copyright

**Action:** Replace with your actual app/company name

---

### 2. **UAE-Specific References**
**Current:** Multiple references to "UAE"

**Locations:**
- `homepage.component.html` line 7: "for UAE audit firms"
- `homepage.component.html` line 100: "businesses in the UAE"
- `homepage.component.ts` line 54: "UAE VAT-ready"
- `homepage.component.ts` line 123: "UAE VAT-ready"

**Action:** 
- If targeting other regions, update or remove UAE-specific references
- If keeping UAE focus, verify accuracy of statements

---

### 3. **Statistics/Claims**
**Current:** "Reduce manual data entry by up to 90%"

**Location:**
- `homepage.component.ts` line 115

**Action:** 
- Verify this statistic is accurate
- Update if you have different data
- Consider making it configurable or removing if unverified

---

### 4. **Button Text**
**Current:** "Start Free Trial"

**Location:**
- `homepage.component.html` line 103

**Action:**
- Change to "Get Started" if no free trial
- Change to "Request Demo" if demo-based
- Change to "Contact Sales" if enterprise-only
- Or keep if you do offer free trials

---

### 5. **FTA References**
**Current:** "FTA submissions" and "FTA-ready reports"

**Locations:**
- `homepage.component.ts` line 54: "FTA submissions"
- `homepage.component.ts` line 123: "FTA-compliant reporting"

**Action:**
- Update if targeting different tax authorities
- Remove if not applicable to your market

---

### 6. **Color Scheme** (Brand Colors)
**Current:** Purple gradient (`#667eea` to `#764ba2`)

**Locations:**
- `homepage.component.scss` line 3: Background gradient
- `homepage.component.scss` line 11: Hero section gradient
- `homepage.component.scss` line 102: Benefit card title color
- `homepage.component.scss` line 155: Feature icon color
- `homepage.component.scss` line 207: Use case icon color
- `homepage.component.scss` line 228: CTA section gradient

**Action:**
- Replace with your brand colors
- Update all gradient instances for consistency

---

### 7. **Hero Subtitle Text**
**Current:** "Intelligent expense management for UAE audit firms..."

**Location:**
- `homepage.component.html` line 7

**Action:**
- Customize to match your target audience
- Update value proposition if different

---

### 8. **CTA Section Text**
**Current:** "Join leading audit firms and businesses in the UAE who trust Smart Expense Tracker"

**Location:**
- `homepage.component.html` line 100

**Action:**
- Update with actual customer testimonials if available
- Make more generic if preferred
- Add social proof if you have it

---

## Quick Change Checklist

- [ ] Replace "Smart Expense Tracker" with your app name (4 locations)
- [ ] Update/remove UAE-specific references (4 locations)
- [ ] Verify/update "90%" statistic
- [ ] Change "Start Free Trial" button text if needed
- [ ] Update FTA references if not applicable
- [ ] Replace color scheme with brand colors (6 locations)
- [ ] Customize hero subtitle
- [ ] Update CTA section text

---

## Recommended: Make Values Configurable

Consider moving these to a configuration object or environment file:

```typescript
// In homepage.component.ts
appConfig = {
  appName: 'Smart Expense Tracker',
  region: 'UAE',
  hasFreeTrial: true,
  statistics: {
    timeReduction: '90%'
  },
  brandColors: {
    primary: '#667eea',
    secondary: '#764ba2'
  }
};
```

This makes future updates easier and allows for environment-specific customization.

