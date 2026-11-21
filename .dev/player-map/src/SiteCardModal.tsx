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

  return (
    <CardModal open={open} onClose={onClose} labelledBy="site-card-title">
      {isHub ? (
        hubShowsDistrict ? (
          <button
            type="button"
            className="card-modal__stack card-modal__stack--flip"
            onClick={() => setHubShowsDistrict(false)}
          >
            <h2 id="site-card-title" className="card-modal__title">{districtName}</h2>
            <img className="card-modal__image" src={districtCardUrl(districtKey)} alt={`${districtName} district card`} />
            <span className="card-modal__hint">Click to view hub</span>
          </button>
        ) : (
          <button
            type="button"
            className="card-modal__stack card-modal__stack--flip"
            onClick={() => setHubShowsDistrict(true)}
          >
            <h2 id="site-card-title" className="card-modal__title">{siteName}</h2>
            <img className="card-modal__image" src={siteHubCardUrl(siteKey)} alt={`${siteName} hub card`} />
            <span className="card-modal__hint">Click to view District</span>
          </button>
        )
      ) : (
        <div className="card-modal__stack">
          <h2 id="site-card-title" className="card-modal__title">{siteName}</h2>
          <img className="card-modal__image" src={districtCardUrl(districtKey)} alt={`${districtName} district card`} />
          <img className="card-modal__image" src={siteCardUrl(siteKey)} alt={`${siteName} site card`} />
        </div>
      )}
    </CardModal>
  );
}
