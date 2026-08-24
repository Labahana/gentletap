import { useEffect } from 'react';
import { getAffiliateRefFromUrl, setAffiliateRefCookie, trackAffiliateClick } from '../lib/affiliate';

/** Captures ?ref= from the URL into a cookie and records the click. Mount once at app root. */
export const AffiliateRefTracker: React.FC = () => {
  useEffect(() => {
    const fromUrl = getAffiliateRefFromUrl();
    if (!fromUrl) return;
    setAffiliateRefCookie(fromUrl);
    void trackAffiliateClick(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};
