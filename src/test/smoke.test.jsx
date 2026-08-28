import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('test environment', () => {
  it('renders React content', () => {
    render(<p>GenStory test</p>);
    expect(screen.getByText('GenStory test')).toBeInTheDocument();
  });
});
