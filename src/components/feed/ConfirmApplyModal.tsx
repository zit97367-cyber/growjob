"use client";

type Props = {
  open: boolean;
  title: string;
  company: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmApplyModal({ open, title, company, onCancel, onConfirm }: Props) {
  return (
    <div className={`modal-overlay ${open ? "open" : ""}`}>
      <div className={`confirm-modal ${open ? "open" : ""}`}>
        <p className="card-title">Confirm apply</p>
        <p className="soft-text mt-2">
          You are applying to <strong>{title}</strong> at <strong>{company}</strong>. You will be redirected to the company job page.
        </p>
        <div className="mt-4 flex gap-2">
          <button className="action-btn w-full" onClick={onCancel}>Cancel</button>
          <button className="action-btn primary w-full" onClick={onConfirm}>Continue</button>
        </div>
      </div>
    </div>
  );
}
