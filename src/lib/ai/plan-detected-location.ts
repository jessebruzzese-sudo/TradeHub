/** Location hints extracted from plan text / AI (used by plan analysis, not persisted as a listing). */
export type DetectedLocation = {
  confidence?: number;
  suburb?: string | null;
  postcode?: string | null;
  state?: string | null;
  address_text?: string | null;
};
