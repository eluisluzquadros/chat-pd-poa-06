import React from 'react';

export function InfiniteScroll({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}

export function useInfiniteScroll() {
  return {
    data: [],
    hasNext: false,
    isLoading: false,
    isError: false,
    errorMessage: '',
    loadMore: () => {},
    reset: () => {},
    retry: () => {}
  };
}