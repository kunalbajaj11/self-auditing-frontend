import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './login/login.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { LicenseRegistrationComponent } from './license-registration/license-registration.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

@NgModule({
  declarations: [
    LoginComponent,
    UnauthorizedComponent,
    LicenseRegistrationComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
  ],
  imports: [SharedModule, AuthRoutingModule],
})
export class AuthModule {}
