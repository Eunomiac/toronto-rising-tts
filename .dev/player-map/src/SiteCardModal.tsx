import { useState } from 'react';
import { CardModal } from './CardModal';
import { districtCardUrl, isKnownSiteHub, siteCardUrl, siteHubCardUrl } from './districtAssets';

interface SiteCardModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly siteKey: string;
  readonly siteName: string;
  readonly hub: boolean;
  readonly districtKey: string;
  readonly districtName: string;
}

export function SiteCardModal({
  open,
  onClose,
  siteKey,
  siteName,
  hub,
  districtKey,
  districtName,
}: SiteCardModalProps) {
  const [hubShowsDistrict, setHubShowsDistrict] = useState(false);
  const isHub = hub && isKnownSiteHub(siteKey);

  // Reset flip whenever a different site opens.
  const [lastKey, setLastKey] = useState(siteKey);
  if (lastKey !== siteKey) {
    setLastKey(siteKey);
    setHubShowsDistrict(false);
  }

  const ariaLabel = isHub
    ? (hubShowsDistrict ? `${districtName} district card` : `${siteName} hub card`)
    : `${siteName} site card`;

  return (
    <CardModal open={open} onClose={onClose} ariaLabel={ariaLabel}>
      {isHub ? (
        hubShowsDistrict ? (
          <div className="card-modal__stack card-modal__stack--hub-district">
            <button
              type="button"
              className="card-modal__hit card-modal__hit--district-alone"
              data-card-surface
              aria-label="Click to view hub"
              onClick={() => setHubShowsDistrict(false)}
            >
              <img
                className="card-modal__image card-modal__image--district-alone"
                src={districtCardUrl(districtKey)}
                alt={`${districtName} district card`}
              />
            </button>
            <span className="card-modal__hint">Click to view hub</span>
          </div>
        ) : (
          <div className="card-modal__stack card-modal__stack--hub">
            <button
              type="button"
              className="card-modal__hit card-modal__hit--hub"
              data-card-surface
              aria-label="Click to view District"
              onClick={() => setHubShowsDistrict(true)}
            >
              <img
                className="card-modal__image card-modal__image--hub"
                src={siteHubCardUrl(siteKey)}
                alt={`${siteName} hub card`}
              />
            </button>
            <span className="card-modal__hint">Click to view District</span>
          </div>
        )
      ) : (
        <div className="card-modal__stack card-modal__stack--site-over-district">
          <img
            className="card-modal__image card-modal__image--district"
            data-card-surface
            src={districtCardUrl(districtKey)}
            alt={`${districtName} district card`}
          />
          <img
            className="card-modal__image card-modal__image--site"
            data-card-surface
            src={siteCardUrl(siteKey)}
            alt={`${siteName} site card`}
          />
        </div>
      )}
    </CardModal>
  );
}
