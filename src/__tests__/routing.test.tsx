import { render, screen } from '@testing-library/react';
import App from '../App';

describe('routing/basic app smoke', () => {
	it('renders the main landmark', () => {
		render(<App />);
		expect(screen.getByRole('main')).toBeInTheDocument();
	});
});

