import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BottomNav } from './bottom-nav';

describe('BottomNav', () => {
  let fixture: ComponentFixture<BottomNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNav],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(BottomNav);
  });

  const el = (sel: string) => fixture.nativeElement.querySelector(sel) as HTMLElement | null;

  it('ilumina Menú cuando la ruta activa vive en el drawer', () => {
    fixture.componentRef.setInput('currentTab', 'insumos');
    fixture.detectChanges();
    expect(el('.menu-btn')?.classList.contains('active')).toBe(true);
  });

  it('no ilumina Menú cuando la ruta activa es un tab de la barra', () => {
    fixture.componentRef.setInput('currentTab', 'donaciones');
    fixture.detectChanges();
    expect(el('.menu-btn')?.classList.contains('active')).toBe(false);
  });

  it('abre el drawer y lo cierra al navegar', () => {
    fixture.detectChanges();
    expect(el('.drawer')).toBeNull();

    el('.menu-btn')?.click();
    fixture.detectChanges();
    expect(el('.drawer')).not.toBeNull();

    (fixture.nativeElement.querySelector('.drawer a') as HTMLElement).click();
    fixture.detectChanges();
    expect(el('.drawer')).toBeNull();
  });
});
