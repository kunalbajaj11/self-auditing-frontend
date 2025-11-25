import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './login/login.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { LicenseRegistrationComponent } from './license-registration/license-registration.component';

@NgModule({
  declarations: [LoginComponent, UnauthorizedComponent, LicenseRegistrationComponent],
  imports: [SharedModule, AuthRoutingModule],
})
export class AuthModule {}
