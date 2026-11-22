import { CardModal } from './CardModal';
import { coterieByKey, coterieImageUrl } from './coteries';

interface CoterieModalProps {
  readonly coterieKey: string | null;
  readonly onClose: () => void;
}

export function CoterieModal({ coterieKey, onClose }: CoterieModalProps) {
  const coterie = coterieByKey(coterieKey);
  return (
    <CardModal
      open={coterie !== null}
      onClose={onClose}
      ariaLabel={coterie ? `${coterie.displayName} coterie` : 'Coterie'}
      marker="coterie"
    >
      {coterie ? (
        <img
          className="card-modal__image card-modal__image--coterie"
          src={coterieImageUrl(coterie.image)}
          alt={coterie.displayName}
        />
      ) : null}
    </CardModal>
  );
}
