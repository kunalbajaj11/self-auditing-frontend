# app-form-field (Tailwind form field)

Shared form field component that replaces `mat-form-field` + `input`/`textarea` with Tailwind-styled inputs. Use for all text inputs and textareas; keep `mat-form-field` only for `mat-select` and other Material controls that need it.

## Usage

```html
<!-- Basic -->
<app-form-field label="Name">
  <input formControlName="name" />
</app-form-field>

<!-- With error -->
<app-form-field
  label="Email"
  [error]="form.get('email')?.touched && form.get('email')?.hasError('required') ? 'Email is required' : ''"
>
  <input type="email" formControlName="email" />
</app-form-field>

<!-- With hint -->
<app-form-field label="Payment Terms" hint="e.g., 30, 60, 90">
  <input type="number" formControlName="paymentTerms" />
</app-form-field>

<!-- With prefix icon -->
<app-form-field label="License Key">
  <mat-icon prefix class="!text-gray-500">vpn_key</mat-icon>
  <input formControlName="licenseKey" />
</app-form-field>

<!-- With suffix (e.g. password toggle or datepicker) -->
<app-form-field label="Password" [error]="...">
  <input [type]="hidePassword ? 'password' : 'text'" formControlName="password" />
  <button suffix type="button" (click)="hidePassword = !hidePassword" class="p-1 rounded hover:bg-gray-100 ...">
    <mat-icon class="!text-[20px] !w-5 !h-5">visibility</mat-icon>
  </button>
</app-form-field>

<!-- Textarea -->
<app-form-field label="Description" class="full-width">
  <textarea formControlName="description" rows="3"></textarea>
</app-form-field>

<!-- Datepicker -->
<app-form-field label="Due Date">
  <input [matDatepicker]="picker" formControlName="dueDate" placeholder="Select date" />
  <mat-datepicker-toggle suffix [for]="picker"></mat-datepicker-toggle>
  <mat-datepicker #picker></mat-datepicker>
</app-form-field>
```

## Inputs

| Input     | Type    | Default | Description                          |
|----------|---------|---------|--------------------------------------|
| label    | string  | ''      | Label text above the input           |
| hint     | string  | ''      | Helper text below (hidden when error)|
| error    | string  | ''      | Error message (shows error state)    |
| required | boolean | false   | Shows * next to label                |
| fullWidth| boolean | true    | Apply w-full to container            |

## Content projection

- **Default slot**: the control (input, textarea, or input + mat-autocomplete).
- **`[prefix]`**: content before the control (e.g. mat-icon).
- **`[suffix]`**: content after the control (e.g. datepicker toggle, clear button).
