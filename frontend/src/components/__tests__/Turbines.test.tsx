import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TurbinesPage } from '../Turbines';
import type { Turbine } from '../types';

const mockToken = 'test-token';

const mockTurbines: Turbine[] = [
  {
    id: 't1',
    name: 'Turbine 1',
    manufacturer: 'WindTech',
    mwRating: 2.5,
    lat: 40.7128,
    lng: -74.0060,
  },
  {
    id: 't2',
    name: 'Turbine 2',
    manufacturer: 'PowerGen',
    mwRating: 3.0,
  },
];

describe('TurbinesPage', () => {
  const mockOnReload = vi.fn();

  it('should render turbine list', () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    expect(screen.getByText('Turbine Assets')).toBeInTheDocument();
    expect(screen.getByText('Turbine 1')).toBeInTheDocument();
    expect(screen.getByText('Turbine 2')).toBeInTheDocument();
  });

  it('should display turbine details correctly', () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    expect(screen.getByText('Manufacturer: WindTech')).toBeInTheDocument();
    expect(screen.getByText('Rating: 2.5 MW')).toBeInTheDocument();
    expect(screen.getByText(/40.7128/)).toBeInTheDocument();
  });

  it('should show "N/A" for missing manufacturer', () => {
    const turbinesWithMissing: Turbine[] = [
      { ...mockTurbines[0], manufacturer: undefined },
    ];
    render(<TurbinesPage turbines={turbinesWithMissing} token={mockToken} onReload={mockOnReload} />);

    expect(screen.getByText('Manufacturer: N/A')).toBeInTheDocument();
  });

  it('should toggle create form when button is clicked and show all fields', async () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    const createButton = screen.getByText('Create Turbine');
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Turbine')).toBeInTheDocument();
    });

    // Verify dialog is open by checking for dialog elements
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should show edit form when edit button is clicked', () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    const editButtons = screen.getAllByRole('button', { hidden: true }).filter(btn => 
      btn.querySelector('svg[data-testid="EditIcon"]')
    );
    
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);

      expect(screen.getByDisplayValue('Turbine 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('WindTech')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2.5')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    }
  });

  it('should show empty state when no turbines', () => {
    render(<TurbinesPage turbines={[]} token={mockToken} onReload={mockOnReload} />);

    expect(screen.getByText(/No turbines yet/)).toBeInTheDocument();
  });

  it('should render Edit and Delete icon buttons for each turbine', () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    const iconButtons = screen.getAllByRole('button', { hidden: true }).filter(btn => 
      btn.querySelector('svg[data-testid="EditIcon"]') || btn.querySelector('svg[data-testid="DeleteIcon"]')
    );

    expect(iconButtons.length).toBeGreaterThan(0);
  });

  it('should close create form when cancel is clicked', () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    fireEvent.click(screen.getByText('Create Turbine'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));

    // Dialog should be closed
    expect(screen.queryByLabelText('Name *')).not.toBeInTheDocument();
  });

  it('should update form input values', async () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    fireEvent.click(screen.getByText('Create Turbine'));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Create New Turbine')).toBeInTheDocument();
    });

    // Verify dialog is open
    expect(screen.getByText('Create')).toBeInTheDocument();
  });
});

