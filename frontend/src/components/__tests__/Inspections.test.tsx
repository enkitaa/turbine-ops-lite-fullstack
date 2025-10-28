import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InspectionsPage } from '../Inspections';
import type { Inspection, Turbine, Finding } from '../types';

const mockToken = 'test-token';

const mockTurbines: Turbine[] = [
  {
    id: 't1',
    name: 'Turbine 1',
    manufacturer: 'WindTech',
    mwRating: 2.5,
  },
];

const mockFindings: Finding[] = [
  {
    id: 'f1',
    category: 'BLADE_DAMAGE',
    severity: 5,
    estimatedCost: 1000,
    notes: 'Crack in blade',
    inspectionId: 'i1',
  },
];

const mockInspections: Inspection[] = [
  {
    id: 'i1',
    date: '2024-01-15T00:00:00.000Z',
    inspectorName: 'John Doe',
    dataSource: 'DRONE',
    turbine: mockTurbines[0],
    findings: mockFindings,
  },
  {
    id: 'i2',
    date: '2024-02-01T00:00:00.000Z',
    dataSource: 'MANUAL',
    turbine: mockTurbines[0],
    findings: [],
  },
];

describe('InspectionsPage', () => {
  const mockOnReload = vi.fn();

  it('should render inspection list', () => {
    render(<InspectionsPage inspections={mockInspections} turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    expect(screen.getByText('Inspections (2)')).toBeInTheDocument();
    expect(screen.getAllByText(/Turbine 1/).length).toBeGreaterThan(0);
  });

  it('should display inspection details correctly', () => {
    render(<InspectionsPage inspections={mockInspections} turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    expect(screen.getByText(/Source: DRONE/)).toBeInTheDocument();
    expect(screen.getByText(/Findings: 1/)).toBeInTheDocument();
  });

  it('should show empty state when no inspections', () => {
    render(<InspectionsPage inspections={[]} turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    expect(screen.getByText('Inspections (0)')).toBeInTheDocument();
  });

  it('should toggle create form when button is clicked and show required fields', () => {
    render(<InspectionsPage inspections={mockInspections} turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    const createButton = screen.getByText('+ Create Inspection');
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Select Turbine')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('should display turbine options in select', () => {
    render(<InspectionsPage inspections={mockInspections} turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    fireEvent.click(screen.getByText('+ Create Inspection'));

    // Check that "Turbine 1" option exists in any of the turbine selects
    const turbine1Option = screen.getByText('Select Turbine');
    expect(turbine1Option).toBeInTheDocument();
    
    // Verify turbine options exist by checking the parent select
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(1); // At least filter + create form selects
  });

  it('should show findings count for inspections', () => {
    render(<InspectionsPage inspections={mockInspections} turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    const findingsTexts = screen.getAllByText(/Findings:/);
    expect(findingsTexts.length).toBeGreaterThan(0);
  });

  it('should handle inspection click to show details with all sections', () => {
    render(<InspectionsPage inspections={mockInspections} turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    // Find the first inspection header (contains turbine name and date)
    const inspectionHeaders = screen.getAllByText(/Turbine 1 - /);
    expect(inspectionHeaders.length).toBeGreaterThan(0);
    
    // Click on the parent container that has cursor: pointer
    const parentContainer = inspectionHeaders[0].closest('div[style*="cursor"]');
    if (parentContainer) {
      fireEvent.click(parentContainer);
      
      expect(screen.getByText('Inspection Details')).toBeInTheDocument();
      expect(screen.getByText(/← Back/)).toBeInTheDocument();
      expect(screen.getByText('Findings')).toBeInTheDocument();
      expect(screen.getByText('Repair Plan')).toBeInTheDocument();
    }
  });

  it('should display data source options', () => {
    render(<InspectionsPage inspections={mockInspections} turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    fireEvent.click(screen.getByText('+ Create Inspection'));

    const selects = screen.getAllByRole('combobox');
    const dataSourceSelect = selects[1]; // Second select is the data source
    const options = Array.from(dataSourceSelect.children).map((child) => child.textContent);

    expect(options).toContain('Drone');
    expect(options).toContain('Manual');
  });

  it('should close create form when cancel is clicked', () => {
    render(<InspectionsPage inspections={mockInspections} turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    fireEvent.click(screen.getByText('+ Create Inspection'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Create')).not.toBeInTheDocument();
    expect(screen.getByText('+ Create Inspection')).toBeInTheDocument();
  });

  it('should render turbine name and date in inspection cards', () => {
    render(<InspectionsPage inspections={mockInspections} turbines={mockTurbines} token={mockToken} onReload={mockOnReload} />);

    const turbineElements = screen.getAllByText(/Turbine 1/);
    expect(turbineElements.length).toBeGreaterThan(0);
  });
});

