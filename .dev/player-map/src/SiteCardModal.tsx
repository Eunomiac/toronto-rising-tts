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
          <button
            type="button"
            className="card-modal__stack card-modal__stack--flip card-modal__stack--hub-district"
            onClick={() => setHubShowsDistrict(false)}
          >
            <img
              className="card-modal__image card-modal__image--district-alone"
              src={districtCardUrl(districtKey)}
              alt={`${districtName} district card`}
            />
            <span className="card-modal__hint">Click to view hub</span>
          </button>
        ) : (
          <button
            type="button"
            className="card-modal__stack card-modal__stack--flip card-modal__stack--hub"
            onClick={() => setHubShowsDistrict(true)}
          >
            <img
              className="card-modal__image card-modal__image--hub"
              src={siteHubCardUrl(siteKey)}
              alt={`${siteName} hub card`}
            />
            <span className="card-modal__hint">Click to view District</span>
          </button>
        )
      ) : (
        <div className="card-modal__stack card-modal__stack--site-over-district">
          <img
            className="card-modal__image card-modal__image--district"
            src={districtCardUrl(districtKey)}
            alt={`${districtName} district card`}
          />
          <img
            className="card-modal__image card-modal__image--site"
            src={siteCardUrl(siteKey)}
            alt={`${siteName} site card`}
          />
        </div>
      )}
    </CardModal>
  );
}
