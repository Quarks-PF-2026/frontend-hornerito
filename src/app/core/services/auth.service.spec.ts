import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // El servicio arranca leyendo la sesión de localStorage: sin limpiar, un
    // test filtra su token al siguiente.
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('register', () => {
    it('posts registration data to the backend', () => {
      service
        .register('María González', 'maria@example.com', 'password1', 'password1', true)
        .subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'María González',
        email: 'maria@example.com',
        password: 'password1',
        confirmPassword: 'password1',
        acceptedTerms: true,
      });
      req.flush({ email: 'maria@example.com' });
    });
  });

  describe('login', () => {
    it('sets authenticated on success', () => {
      let result: { ok: boolean; unverified: boolean; error: string } | undefined;
      service.login('maria@example.com', 'password1').subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ accessToken: 'jwt', user: { id: '1', name: 'María', email: 'maria@example.com' } });

      expect(result).toEqual({ ok: true, unverified: false, error: '' });
      expect(service.authenticated()).toBe(true);
    });

    it('maps an unverified-account error without setting authenticated', () => {
      let result: { ok: boolean; unverified: boolean; error: string } | undefined;
      service.login('pendiente@example.com', 'password1').subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(
        { message: 'Verificá tu cuenta antes de iniciar sesión.', unverified: true },
        { status: 401, statusText: 'Unauthorized' },
      );

      expect(result).toEqual({ ok: false, unverified: true, error: '' });
      expect(service.authenticated()).toBe(false);
    });

    it('maps an invalid-credentials error', () => {
      let result: { ok: boolean; unverified: boolean; error: string } | undefined;
      service.login('maria@example.com', 'wrong').subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(
        { message: 'Correo o contraseña incorrectos.' },
        { status: 401, statusText: 'Unauthorized' },
      );

      expect(result).toEqual({
        ok: false,
        unverified: false,
        error: 'Correo o contraseña incorrectos.',
      });
    });
  });

  describe('forgotPassword', () => {
    it('posts email to /auth/forgot-password', () => {
      let result: { message: string } | undefined;
      service.forgotPassword('user@example.com').subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/forgot-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'user@example.com' });
      req.flush({ message: 'Si el correo está registrado...' });

      expect(result?.message).toContain('Si el correo está registrado');
    });
  });

  describe('verifyEmail', () => {
    it('returns true when the verification token is valid', () => {
      let ok: boolean | undefined;
      service.verifyEmail('valid-token').subscribe((r) => (ok = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/verify?token=valid-token`);
      expect(req.request.method).toBe('GET');
      req.flush(null);

      expect(ok).toBe(true);
    });

    it('returns false when the token expired or was already used', () => {
      let ok: boolean | undefined;
      service.verifyEmail('used-token').subscribe((r) => (ok = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/verify?token=used-token`);
      req.flush(
        { message: 'El enlace de verificación no es válido.' },
        { status: 400, statusText: 'Bad Request' },
      );

      expect(ok).toBe(false);
    });
  });

  describe('resendVerification', () => {
    it('posts the email and returns the generic message', () => {
      let result: { message: string } | undefined;
      service.resendVerification('user@example.com').subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/resend-verification`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'user@example.com' });
      req.flush({ message: 'Si el correo está registrado y sin verificar...' });

      expect(result?.message).toContain('Si el correo está registrado');
    });
  });

  describe('verifyResetToken', () => {
    it('returns true when token is valid', () => {
      let valid: boolean | undefined;
      service.verifyResetToken('valid-token').subscribe((r) => (valid = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/verify-reset-token?token=valid-token`);
      expect(req.request.method).toBe('GET');
      req.flush(null);

      expect(valid).toBe(true);
    });

    it('returns false when token is invalid or expired', () => {
      let valid: boolean | undefined;
      service.verifyResetToken('invalid-token').subscribe((r) => (valid = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/verify-reset-token?token=invalid-token`);
      req.flush({ message: 'Expiró' }, { status: 400, statusText: 'Bad Request' });

      expect(valid).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('returns ok: true when reset succeeds', () => {
      let result: { ok: boolean; error: string } | undefined;
      service.resetPassword('token', 'newpass123', 'newpass123').subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        token: 'token',
        password: 'newpass123',
        confirmPassword: 'newpass123',
      });
      req.flush(null);

      expect(result).toEqual({ ok: true, error: '' });
    });

    it('returns error message when reset fails', () => {
      let result: { ok: boolean; error: string } | undefined;
      service.resetPassword('token', 'newpass123', 'newpass123').subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/reset-password`);
      req.flush(
        { message: 'El enlace expiró.' },
        { status: 400, statusText: 'Bad Request' },
      );

      expect(result).toEqual({ ok: false, error: 'El enlace expiró.' });
    });
  });
});
