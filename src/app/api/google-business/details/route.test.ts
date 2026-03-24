import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

describe('GET /api/google-business/details', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_PLACES_API_KEY;
  });

  it('returns 400 when placeId is missing/blank', async () => {
    process.env.GOOGLE_PLACES_API_KEY = 'test-key';
    const res = await GET(new Request('http://localhost/api/google-business/details?placeId='));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ ok: false, error: 'Missing placeId' });
  });

  it('returns normalized shape when Google succeeds', async () => {
    process.env.GOOGLE_PLACES_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        result: {
          place_id: 'pid-1',
          name: 'Acme Plumbing',
          formatted_address: '10 Main St, Sydney NSW, Australia',
          rating: 4.6,
          user_ratings_total: 42,
          url: 'https://maps.google.com/?cid=123',
          geometry: { location: { lat: -33.86, lng: 151.2 } },
        },
      }),
    } as Response);

    const res = await GET(new Request('http://localhost/api/google-business/details?placeId=pid-1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      placeId: 'pid-1',
      name: 'Acme Plumbing',
      address: '10 Main St, Sydney NSW, Australia',
      rating: 4.6,
      reviewCount: 42,
      googleMapsUrl: 'https://maps.google.com/?cid=123',
    });
    expect((json as any).status).toBeUndefined();
    expect((json as any).geometry).toBeUndefined();
  });

  it('handles missing optional fields gracefully', async () => {
    process.env.GOOGLE_PLACES_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        result: {
          place_id: 'pid-2',
          name: 'No Rating Business',
          formatted_address: '11 Side St, Melbourne VIC, Australia',
        },
      }),
    } as Response);

    const res = await GET(new Request('http://localhost/api/google-business/details?placeId=pid-2'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      placeId: 'pid-2',
      name: 'No Rating Business',
      address: '11 Side St, Melbourne VIC, Australia',
      rating: null,
      reviewCount: null,
      googleMapsUrl: null,
    });
  });

  it('returns safe error response when Google upstream fails', async () => {
    process.env.GOOGLE_PLACES_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ status: 'REQUEST_DENIED', error_message: 'Invalid key' }),
    } as Response);

    const res = await GET(new Request('http://localhost/api/google-business/details?placeId=pid-3'));
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json).toEqual({ ok: false, error: 'Could not load business details' });
    expect((json as any).error_message).toBeUndefined();
  });
});
