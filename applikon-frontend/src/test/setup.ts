import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'
import i18n from '../i18n'

// Tests assert on Polish text, so fix the language to 'pl' in the jsdom environment
// (LanguageDetector finds no browser signals in jsdom and falls back to 'en')
i18n.changeLanguage('pl')

// Mock fetch API for tests
global.fetch = vi.fn()

// Reset mocks before each test
beforeEach(() => {
  vi.resetAllMocks()
})
