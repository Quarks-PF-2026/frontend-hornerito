import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * El token va solo a nuestra API. Los adjuntos de publicaciones se suben
 * directo a Cloudinary desde el navegador: si el header saliera en esa
 * request, el JWT le llegaría a un tercero.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('accessToken');
  const { apiUrl } = environment;
  // Con el `/` final: `http://localhost:3000` no debe matchear `http://localhost:3000.evil.com`.
  const isApi = req.url === apiUrl || req.url.startsWith(`${apiUrl}/`);
  if (!token || !isApi) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
