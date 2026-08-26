import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { Member } from '../models/member.model';
import { MembersService } from './members.service';

function member(overrides: Partial<Member> = {}): Member {
  return {
    userId: 'user-1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    role: 'voluntario',
    active: true,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('MembersService', () => {
  let service: MembersService;
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/organization/members`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MembersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the members into the signal', () => {
    service.load().subscribe();
    httpMock.expectOne(url).flush([member()]);

    expect(service.members().length).toBe(1);
    expect(service.members()[0].email).toBe('juan@example.com');
  });

  it('replaces the member in place after a toggle', () => {
    service.load().subscribe();
    httpMock.expectOne(url).flush([member(), member({ userId: 'user-2' })]);

    service.toggle('user-1').subscribe();
    const req = httpMock.expectOne(`${url}/user-1/toggle`);
    expect(req.request.method).toBe('PATCH');
    req.flush(member({ active: false }));

    expect(service.members()[0].active).toBe(false);
    expect(service.members()[1].active).toBe(true);
  });

  it('replaces the member in place after a role change', () => {
    service.load().subscribe();
    httpMock.expectOne(url).flush([member()]);

    service.changeRole('user-1', 'coordinador').subscribe();
    const req = httpMock.expectOne(`${url}/user-1/role`);
    expect(req.request.body).toEqual({ role: 'coordinador' });
    req.flush(member({ role: 'coordinador' }));

    expect(service.members()[0].role).toBe('coordinador');
  });

  it('drops a cancelled invitation from the list', () => {
    service.loadInvitations().subscribe();
    httpMock.expectOne(`${url}/invitations`).flush([
      { id: 'inv-1', email: 'a@example.com', role: 'voluntario', expiresAt: '', createdAt: '' },
      { id: 'inv-2', email: 'b@example.com', role: 'admin', expiresAt: '', createdAt: '' },
    ]);

    service.cancelInvitation('inv-1').subscribe();
    httpMock.expectOne(`${url}/invitations/inv-1`).flush(null);

    expect(service.invitations().map((i) => i.id)).toEqual(['inv-2']);
  });
});
