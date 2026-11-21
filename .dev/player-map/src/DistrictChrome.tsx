import { useState } from 'react';
import { CardModal } from './CardModal';
import { districtCardUrl, districtFooterUrl, districtHeaderUrl } from './districtAssets';

interface DistrictChromeProps {
  readonly districtKey: string;
  readonly districtName: string;
}

export function DistrictChrome({ districtKey, districtName }: DistrictChromeProps) {
  const [cardOpen, setCardOpen] = useState(false);
  const [tooltip, setTooltip] = useState(false);

  return (
    <>
      <div className="district-chrome" data-note-surface="district-chrome" data-gsap="district-chrome">
        <button
          type="button"
          className="district-chrome__header"
          aria-label={`${districtName} district card`}
          onMouseEnter={() => setTooltip(true)}
          onMouseLeave={() => setTooltip(false)}
          onFocus={() => setTooltip(true)}
          onBlur={() => setTooltip(false)}
          onClick={() => setCardOpen(true)}
        >
          <img src={districtHeaderUrl(districtKey)} alt="" />
          {tooltip ? (
            <span className="district-chrome__tooltip" aria-hidden="true">
              <img src={districtCardUrl(districtKey)} alt="" />
            </span>
          ) : null}
        </button>
        <div className="district-chrome__footer" aria-hidden="true">
          <img src={districtFooterUrl(districtKey)} alt="" />
        </div>
      </div>
      <CardModal open={cardOpen} onClose={() => setCardOpen(false)} labelledBy="district-card-title">
        <h2 id="district-card-title" className="card-modal__title">{districtName}</h2>
        <img className="card-modal__image" src={districtCardUrl(districtKey)} alt={`${districtName} district card`} />
      </CardModal>
    </>
  );
}
