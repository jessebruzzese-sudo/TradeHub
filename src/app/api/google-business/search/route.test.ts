import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

describe('GET /api/google-business/search', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_PLACES_API_KEY;
  });

  it('returns 400 when q is missing/blank', async () => {
    process.env.GOOGLE_PLACES_API_KEY = 'test-key';
    const res = await GET(new Request('http://localhost/api/google-business/search?q='));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: 'Missing or invalid q' });
  });

  it('returns sanitized predictions when Google succeeds', async () => {
    process.env.GOOGLE_PLACES_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        predictions: [
          {
            place_id: 'abc123',
            description: 'Acme Plumbing, Sydney NSW, Australia',
            structured_formatting: { main_text: 'Acme Plumbing' },
            matched_substrings: [{ length: 4, offset: 0 }],
            terms: [{ value: 'Acme Plumbing', offset: 0 }],
          },
        ],
      }),
    } as Response);

    const res = await GET(new Request('http://localhost/api/google-business/search?q=acme'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      predictions: [{ placeId: 'abc123', description: 'Acme Plumbing, Sydney NSW, Australia' }],
    });
    expect((json.predictions?.[0] as any).structured_formatting).toBeUndefined();
    expect((json.predictions?.[0] as any).matched_substrings).toBeUndefined();
  });

  it('returns safe error response when Google upstream fails', async () => {
    process.env.GOOGLE_PLACES_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ status: 'REQUEST_DENIED', error_message: 'Invalid key' }),
    } as Response);

    const res = await GET(new Request('http://localhost/api/google-business/search?q=acme'));
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json).toEqual({ ok: false, error: 'Google business search failed' });
    expect((json as any).error_message).toBeUndefined();
  });
});
