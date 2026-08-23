import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { BANGLADESH_DISTRICTS as FALLBACK_DISTRICTS } from '../mockData';
import type { DistrictOption } from '../types';

// Approximate centre of each of Bangladesh's 8 divisions. These are the same
// coordinates the app already used for its original (division-level) list, so
// this isn't new data — just reused as a sane fallback centre-point for every
// district within that division, since precise per-district coordinates for
// all 64 districts aren't something we can source reliably enough to trust on
// a map. Real donor pins still use the donor's own location when set.
const DIVISION_CENTERS: Record<string, { lat: number; lng: number }> = {
  Dhaka: { lat: 23.8103, lng: 90.4125 },
  Chattogram: { lat: 22.3569, lng: 91.7832 },
  Sylhet: { lat: 24.8949, lng: 91.8687 },
  Rajshahi: { lat: 24.3745, lng: 88.6042 },
  Khulna: { lat: 22.8456, lng: 89.5403 },
  Barishal: { lat: 22.701, lng: 90.3535 },
  Rangpur: { lat: 25.7439, lng: 89.2752 },
  Mymensingh: { lat: 24.7471, lng: 90.4203 }
};

let districtsLoad: Promise<DistrictOption[] | null> | null = null;

/**
 * Real districts and areas, fetched from the database instead of a hardcoded
 * list of 8 items that were actually Bangladesh's 8 divisions mislabeled as
 * districts. Adding a new area now only needs a SQL insert, not a code change
 * and redeploy.
 *
 * Shaped exactly like the old BANGLADESH_DISTRICTS constant — { name, areas }[]
 * — so every dropdown built against that shape keeps working without changes.
 * Falls back to the old static list only if the database can't be reached, so
 * the form never renders empty.
 */
export function useDistricts(): DistrictOption[] {
  const [districts, setDistricts] = useState<DistrictOption[]>(FALLBACK_DISTRICTS);

  useEffect(() => {
    let cancelled = false;

    if (supabase) {
      districtsLoad ||= (async () => {
        const { data, error } = await supabase
          .from('locations')
          .select('district, area, division')
          .order('district')
          .order('area');

        if (error || !data || data.length === 0) {
          if (error) console.error('Failed to load locations:', error.message);
          return null; // keep the fallback list
        }

        const byDistrict = new Map<string, { areas: string[]; division: string }>();
        for (const row of data as { district: string; area: string; division: string }[]) {
          const entry = byDistrict.get(row.district) || { areas: [], division: row.division };
          entry.areas.push(row.area);
          byDistrict.set(row.district, entry);
        }

        return Array.from(byDistrict.entries()).map(([name, { areas, division }]) => {
          const center = DIVISION_CENTERS[division] || DIVISION_CENTERS.Dhaka;
          return { name, areas, lat: center.lat, lng: center.lng };
        });
      })();

      districtsLoad.then(shaped => {
        if (!cancelled && shaped && shaped.length > 0) setDistricts(shaped);
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return districts;
}
