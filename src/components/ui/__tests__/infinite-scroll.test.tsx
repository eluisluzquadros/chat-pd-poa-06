import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InfiniteScroll, useInfiniteScroll } from '../infinite-scroll';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Test component using the hook
function TestInfiniteScrollComponent() {
  const {
    data,
    hasNext,
    isLoading,
    isError,
    errorMessage,
    loadMore,
    reset,
    retry
  } = useInfiniteScroll<string>();

  const mockLoadFunction = async (cursor?: string) => {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    
    const startIndex = cursor ? parseInt(cursor) : 0;
    const newData = Array.from({ length: 5 }, (_, i) => `Item ${startIndex + i + 1}`);
    
    return {
      data: newData,
      hasNext: startIndex < 15, // Stop after 20 items
      nextCursor: (startIndex + 5).toString()
    };
  };

  return (
    <div>
      <button onClick={() => loadMore(mockLoadFunction)}>Load More</button>
      <button onClick={() => reset()}>Reset</button>
      <button onClick={() => retry(mockLoadFunction)}>Retry</button>
      
      <InfiniteScroll
        hasNext={hasNext}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onLoadMore={() => loadMore(mockLoadFunction)}
        onRetry={() => retry(mockLoadFunction)}
      >
        <div data-testid="items-container">
          {data.map((item, index) => (
            <div key={index}>{item}</div>
          ))}
        </div>
      </InfiniteScroll>
    </div>
  );
}

describe('InfiniteScroll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    const mockOnLoadMore = jest.fn();
    
    render(
      <InfiniteScroll
        hasNext={true}
        isLoading={false}
        onLoadMore={mockOnLoadMore}
      >
        <div data-testid="test-content">Test Content</div>
      </InfiniteScroll>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    const mockOnLoadMore = jest.fn();
    
    render(
      <InfiniteScroll
        hasNext={true}
        isLoading={true}
        onLoadMore={mockOnLoadMore}
      >
        <div>Content</div>
      </InfiniteScroll>
    );

    expect(screen.getByText('Carregando mais itens...')).toBeInTheDocument();
  });

  it('shows end message when no more items', () => {
    const mockOnLoadMore = jest.fn();
    
    render(
      <InfiniteScroll
        hasNext={false}
        isLoading={false}
        onLoadMore={mockOnLoadMore}
      >
        <div>Content</div>
      </InfiniteScroll>
    );

    expect(screen.getByText('✨ Você chegou ao final!')).toBeInTheDocument();
  });

  it('shows error state correctly', () => {
    const mockOnLoadMore = jest.fn();
    const mockOnRetry = jest.fn();
    
    render(
      <InfiniteScroll
        hasNext={true}
        isLoading={false}
        isError={true}
        errorMessage="Test error message"
        onLoadMore={mockOnLoadMore}
        onRetry={mockOnRetry}
      >
        <div>Content</div>
      </InfiniteScroll>
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const mockOnLoadMore = jest.fn();
    const mockOnRetry = jest.fn();
    
    render(
      <InfiniteScroll
        hasNext={true}
        isLoading={false}
        isError={true}
        onLoadMore={mockOnLoadMore}
        onRetry={mockOnRetry}
      >
        <div>Content</div>
      </InfiniteScroll>
    );

    const retryButton = screen.getByText('Tentar novamente');
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('shows load more button when enabled', () => {
    const mockOnLoadMore = jest.fn();
    
    render(
      <InfiniteScroll
        hasNext={true}
        isLoading={false}
        onLoadMore={mockOnLoadMore}
        showLoadMoreButton={true}
      >
        <div>Content</div>
      </InfiniteScroll>
    );

    expect(screen.getByText('Carregar mais')).toBeInTheDocument();
  });

  it('calls onLoadMore when load more button is clicked', () => {
    const mockOnLoadMore = jest.fn();
    
    render(
      <InfiniteScroll
        hasNext={true}
        isLoading={false}
        onLoadMore={mockOnLoadMore}
        showLoadMoreButton={true}
      >
        <div>Content</div>
      </InfiniteScroll>
    );

    const loadMoreButton = screen.getByText('Carregar mais');
    fireEvent.click(loadMoreButton);

    expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
  });

  it('disables load more button when loading', () => {
    const mockOnLoadMore = jest.fn();
    
    render(
      <InfiniteScroll
        hasNext={true}
        isLoading={true}
        onLoadMore={mockOnLoadMore}
        showLoadMoreButton={true}
      >
        <div>Content</div>
      </InfiniteScroll>
    );

    const loadMoreButton = screen.getByText('Carregando...');
    expect(loadMoreButton).toBeDisabled();
  });

  it('shows custom loading component', () => {
    const mockOnLoadMore = jest.fn();
    const customLoading = <div data-testid="custom-loading">Custom Loading</div>;
    
    render(
      <InfiniteScroll
        hasNext={true}
        isLoading={true}
        onLoadMore={mockOnLoadMore}
        loadingComponent={customLoading}
      >
        <div>Content</div>
      </InfiniteScroll>
    );

    expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
  });

  it('shows custom end message', () => {
    const mockOnLoadMore = jest.fn();
    const customEndMessage = <div data-testid="custom-end">Custom End Message</div>;
    
    render(
      <InfiniteScroll
        hasNext={false}
        isLoading={false}
        onLoadMore={mockOnLoadMore}
        endMessage={customEndMessage}
      >
        <div>Content</div>
      </InfiniteScroll>
    );

    expect(screen.getByTestId('custom-end')).toBeInTheDocument();
  });
});

describe('useInfiniteScroll hook', () => {
  it('initializes with correct default state', () => {
    render(<TestInfiniteScrollComponent />);

    expect(screen.getByTestId('items-container')).toBeEmptyDOMElement();
  });

  it('loads more data correctly', async () => {
    render(<TestInfiniteScrollComponent />);

    const loadMoreButton = screen.getByText('Load More');
    fireEvent.click(loadMoreButton);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Item 5')).toBeInTheDocument();
  });

  it('resets state correctly', async () => {
    render(<TestInfiniteScrollComponent />);

    // Load some data first
    const loadMoreButton = screen.getByText('Load More');
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    // Reset
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(screen.getByTestId('items-container')).toBeEmptyDOMElement();
  });

  it('handles loading multiple batches', async () => {
    render(<TestInfiniteScrollComponent />);

    const loadMoreButton = screen.getByText('Load More');
    
    // Load first batch
    fireEvent.click(loadMoreButton);
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    // Load second batch
    fireEvent.click(loadMoreButton);
    await waitFor(() => {
      expect(screen.getByText('Item 6')).toBeInTheDocument();
    });

    // Should have items from both batches
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 5')).toBeInTheDocument();
    expect(screen.getByText('Item 6')).toBeInTheDocument();
    expect(screen.getByText('Item 10')).toBeInTheDocument();
  });
});