-- Master trade catalog for selectors, validation, and filters (source of truth for labels / slugs / order).

CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trades_name_unique UNIQUE (name),
  CONSTRAINT trades_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_trades_active_sort ON public.trades (is_active, sort_order, name);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active trades are readable" ON public.trades;
CREATE POLICY "Active trades are readable"
  ON public.trades
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

COMMENT ON TABLE public.trades IS 'Canonical trade catalog; app selectors read active rows only.';

INSERT INTO public.trades (name, slug, sort_order, is_active) VALUES
  ('Builder/Contractor', 'builder-contractor', 10, true),
  ('Carpentry', 'carpentry', 20, true),
  ('Plumbing', 'plumbing', 30, true),
  ('Electrical', 'electrical', 40, true),
  ('Concreting', 'concreting', 50, true),
  ('Bricklaying / Hebel', 'bricklaying-hebel', 60, true),
  ('Roofing', 'roofing', 70, true),
  ('Plastering / Gyprock', 'plastering-gyprock', 80, true),
  ('Painting & Decorating', 'painting-decorating', 90, true),
  ('Tiling', 'tiling', 100, true),
  ('Flooring', 'flooring', 110, true),
  ('Cabinet Making / Joinery', 'cabinet-making-joinery', 120, true),
  ('Waterproofing', 'waterproofing', 130, true),
  ('Landscaping', 'landscaping', 140, true),
  ('HVAC / Air Conditioning', 'hvac-air-conditioning', 150, true),
  ('Demolition', 'demolition', 160, true),
  ('Labouring', 'labouring', 170, true)
ON CONFLICT (slug) DO NOTHING;
