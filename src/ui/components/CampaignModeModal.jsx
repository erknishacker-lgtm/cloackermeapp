import { X } from '../icons.jsx';

/**
 * Popup: escolher modo simples ou avancado ao criar campanha.
 */
export function CampaignModeModal({ open, onClose, onSelect }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card campaign-mode-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-mode-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Fechar" onClick={onClose}>
          <X size={18} />
        </button>
        <h2 id="campaign-mode-title">Criar Campanha</h2>
        <p className="modal-sub">Selecione o modo de criacao de campanha</p>
        <div className="campaign-mode-actions">
          <button type="button" className="mode-btn primary" onClick={() => onSelect('simple')}>
            Modo simples (recomendado)
          </button>
          <button type="button" className="mode-btn secondary" onClick={() => onSelect('advanced')}>
            Modo avancado
          </button>
        </div>
      </div>
    </div>
  );
}
