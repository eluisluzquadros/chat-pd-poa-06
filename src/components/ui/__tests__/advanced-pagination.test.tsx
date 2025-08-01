import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdvancedPagination, type PaginationInfo } from '../advanced-pagination';

// Mock data
const mockPagination: PaginationInfo = {
  page: 1,
  limit: 20,
  total: 100,
  totalPages: 5,
  hasNext: true,
  hasPrev: false
};

describe('AdvancedPagination', () => {
  const mockOnPageChange = jest.fn();
  const mockOnLimitChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pagination info correctly', () => {
    render(
      <AdvancedPagination
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
      />
    );

    expect(screen.getByText(/Mostrando 1 a 20 de 100 resultados/)).toBeInTheDocument();
  });

  it('renders page numbers correctly', () => {
    render(
      <AdvancedPagination
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
      />
    );

    // Should show page 1 as active
    const page1Button = screen.getByRole('button', { name: 'Página 1' });
    expect(page1Button).toHaveClass('bg-primary');
    
    // Should show other pages
    expect(screen.getByRole('button', { name: 'Página 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 3' })).toBeInTheDocument();
  });

  it('handles page navigation correctly', async () => {
    render(
      <AdvancedPagination
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
      />
    );

    // Click next page
    const nextButton = screen.getByRole('button', { name: 'Próxima página' });
    fireEvent.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('disables previous button on first page', () => {
    render(
      <AdvancedPagination
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
      />
    );

    const prevButton = screen.getByRole('button', { name: 'Página anterior' });
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const lastPagePagination: PaginationInfo = {
      ...mockPagination,
      page: 5,
      hasNext: false,
      hasPrev: true
    };

    render(
      <AdvancedPagination
        pagination={lastPagePagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
      />
    );

    const nextButton = screen.getByRole('button', { name: 'Próxima página' });
    expect(nextButton).toBeDisabled();
  });

  it('shows page size selector when enabled', () => {
    render(
      <AdvancedPagination
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
        showPageSize={true}
      />
    );

    expect(screen.getByText('Itens por página:')).toBeInTheDocument();
  });

  it('handles page size change correctly', async () => {
    render(
      <AdvancedPagination
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
        showPageSize={true}
      />
    );

    // Find and click the select trigger
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);

    // Wait for options to appear and select 50
    await waitFor(() => {
      const option50 = screen.getByText('50');
      fireEvent.click(option50);
    });

    expect(mockOnLimitChange).toHaveBeenCalledWith(50);
  });

  it('shows page jump input when enabled', () => {
    const largePagination: PaginationInfo = {
      ...mockPagination,
      totalPages: 10
    };

    render(
      <AdvancedPagination
        pagination={largePagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
        showPageJump={true}
      />
    );

    expect(screen.getByText('Ir para página:')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('handles page jump correctly', async () => {
    const largePagination: PaginationInfo = {
      ...mockPagination,
      totalPages: 10
    };

    render(
      <AdvancedPagination
        pagination={largePagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
        showPageJump={true}
      />
    );

    const jumpInput = screen.getByRole('spinbutton');
    const jumpButton = screen.getByRole('button', { name: 'Ir' });

    fireEvent.change(jumpInput, { target: { value: '5' } });
    fireEvent.click(jumpButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(5);
  });

  it('handles page jump with Enter key', async () => {
    const largePagination: PaginationInfo = {
      ...mockPagination,
      totalPages: 10
    };

    render(
      <AdvancedPagination
        pagination={largePagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
        showPageJump={true}
      />
    );

    const jumpInput = screen.getByRole('spinbutton');

    fireEvent.change(jumpInput, { target: { value: '7' } });
    fireEvent.keyPress(jumpInput, { key: 'Enter', code: 'Enter' });

    expect(mockOnPageChange).toHaveBeenCalledWith(7);
  });

  it('shows loading state correctly', () => {
    render(
      <AdvancedPagination
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
        isLoading={true}
      />
    );

    // Buttons should be disabled
    const prevButton = screen.getByRole('button', { name: 'Página anterior' });
    const nextButton = screen.getByRole('button', { name: 'Próxima página' });
    
    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(
      <AdvancedPagination
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
        size="sm"
      />
    );

    // Check for small size class (indirect test via button size)
    let buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Test large size
    rerender(
      <AdvancedPagination
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
        size="lg"
      />
    );

    buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('handles ellipsis for large page counts', () => {
    const largePagination: PaginationInfo = {
      ...mockPagination,
      page: 10,
      totalPages: 20,
      hasNext: true,
      hasPrev: true
    };

    render(
      <AdvancedPagination
        pagination={largePagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
      />
    );

    // Should show ellipsis
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('validates jump page input correctly', () => {
    const largePagination: PaginationInfo = {
      ...mockPagination,
      totalPages: 10
    };

    render(
      <AdvancedPagination
        pagination={largePagination}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
        showPageJump={true}
      />
    );

    const jumpInput = screen.getByRole('spinbutton');
    const jumpButton = screen.getByRole('button', { name: 'Ir' });

    // Test invalid page number (too high)
    fireEvent.change(jumpInput, { target: { value: '15' } });
    expect(jumpButton).toBeDisabled();

    // Test invalid page number (too low)
    fireEvent.change(jumpInput, { target: { value: '0' } });
    expect(jumpButton).toBeDisabled();

    // Test valid page number
    fireEvent.change(jumpInput, { target: { value: '5' } });
    expect(jumpButton).not.toBeDisabled();
  });
});