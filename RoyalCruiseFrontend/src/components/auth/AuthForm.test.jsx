// Az AuthForm komponens aktualis API-jat vedo unit tesztek.
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthForm from './AuthForm';

describe('AuthForm Component', () => {
  beforeEach(() => {
    // Minden teszt tiszta mock-allapotbol induljon.
    vi.clearAllMocks();
  });

  it('renders title, fields and submit button from props', () => {
    // A komponens teljes kirenderelt DOM-jat is kerjuk, mert a jelenlegi markupban a label nincs inputhoz kotve for attributummal.
    const { container } = render(<AuthForm title="Bejelentkezes" buttonLabel="Belep" onSubmit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Bejelentkezes' })).toBeTruthy();
    expect(container.querySelector('input[type="email"]')).toBeTruthy();
    expect(container.querySelector('input[type="password"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Belep' })).toBeTruthy();
  });

  it('submits entered email and password through onSubmit callback', async () => {
    const onSubmit = vi.fn();
    // userEvent setup gondoskodik a valos felhasznaloi interakciot kozelito async esemenyekrol.
    const user = userEvent.setup();
    const { container } = render(<AuthForm title="Bejelentkezes" buttonLabel="Belep" onSubmit={onSubmit} />);
    // Tudatosan querySelector-t hasznalunk, mert a label-text alapu lekeres itt nem megbizhato a markup miatt.
    const emailInput = container.querySelector('input[type="email"]');
    const passwordInput = container.querySelector('input[type="password"]');

    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: 'Belep' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
