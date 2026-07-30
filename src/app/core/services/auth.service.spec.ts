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
});
