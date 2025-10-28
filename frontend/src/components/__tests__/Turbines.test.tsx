import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

    expect(screen.getByText('Turbines (2)')).toBeInTheDocument();
    expect(screen.getByText('Turbine 1')).toBeInTheDocument();
    expect(screen.getByText('Turbine 2')).toBeInTheDocument();
  });

  it('should display turbine details correctly', () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    expect(screen.getByText('Manufacturer: WindTech')).toBeInTheDocument();
    expect(screen.getByText('Rating: 2.5 MW')).toBeInTheDocument();
    // Location is displayed but decimal precision may be truncated
    expect(screen.getByText(/Location: 40.7128/)).toBeInTheDocument();
  });

  it('should show "N/A" for missing manufacturer', () => {
    const turbinesWithMissing: Turbine[] = [
      { ...mockTurbines[0], manufacturer: undefined },
    ];
    render(<TurbinesPage turbines={turbinesWithMissing} token={mockToken} onReload={mockOnReload} />);

    expect(screen.getByText('Manufacturer: N/A')).toBeInTheDocument();
  });

  it('should toggle create form when button is clicked and show all fields', () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    const createButton = screen.getByText('+ Create Turbine');
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Name *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Manufacturer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MW Rating')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Latitude')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Longitude')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('should show edit form when edit button is clicked', () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(screen.getByDisplayValue('Turbine 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('WindTech')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2.5')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should show empty state when no turbines', () => {
    render(<TurbinesPage turbines={[]} token={mockToken} onReload={mockOnReload} />);

    expect(screen.getByText('Turbines (0)')).toBeInTheDocument();
  });

  it('should render Edit and Delete buttons for each turbine', () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    const editButtons = screen.getAllByText('Edit');
    const deleteButtons = screen.getAllByText('Delete');

    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  it('should close create form when cancel is clicked', () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    fireEvent.click(screen.getByText('+ Create Turbine'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByPlaceholderText('Name *')).not.toBeInTheDocument();
    expect(screen.getByText('+ Create Turbine')).toBeInTheDocument();
  });

  it('should update form input values', () => {
    render(<TurbinesPage turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    fireEvent.click(screen.getByText('+ Create Turbine'));

    const nameInput = screen.getByPlaceholderText('Name *');
    fireEvent.change(nameInput, { target: { value: 'New Turbine' } });

    expect(nameInput).toHaveValue('New Turbine');
  });
});

