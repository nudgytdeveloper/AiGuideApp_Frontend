import React, { useState } from 'react';

const FeedbackModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <>
      {/* The clickable link/button */}
      <button className="feedback-button" onClick={openModal}>
        Give Feedback
      </button>

      {/* The modal overlay with the embedded form */}
      {isOpen && (
        <div className="feedback-modal-overlay" onClick={closeModal}>
          <div className="feedback-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button className="feedback-close-button" onClick={closeModal}>
              ×
            </button>
            
            {/* Embedded Google Form */}
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSev3x-THtvx_7Ys_QrIyKW2PaqoSNYkffaH63lLF2czCukIDA/viewform?embedded=true"
              width="100%"
              height="2000"
              frameBorder="0"
              marginHeight="0"
              marginWidth="0"
              title="Feedback Form"
            >
              Loading…
            </iframe>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackModal;