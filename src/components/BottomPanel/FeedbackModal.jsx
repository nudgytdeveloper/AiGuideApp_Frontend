import React, { useState } from 'react';

const FeedbackModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <>
      <button className="feedback-button" onClick={openModal}>
        Give Feedback
      </button>

      {isOpen && (
        <div className="feedback-modal-overlay" onClick={closeModal}>
          <div className="feedback-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="feedback-close-button" onClick={closeModal}>
              ×
            </button>
            
            <div style={{ 
              width: '100%', 
              height: '1600px', 
              overflow: 'hidden',
              background: 'white'
            }}>
              <iframe
                src="https://docs.google.com/forms/d/e/1FAIpQLSev3x-THtvx_7Ys_QrIyKW2PaqoSNYkffaH63lLF2czCukIDA/viewform?embedded=true"
                width="640"
                height="1600"
                frameBorder="0"
                marginHeight="0"
                marginWidth="0"
                title="Feedback Form"
                style={{
                  border: 'none',
                  width: '100%',
                  height: '1600px',
                  display: 'block'
                }}
              >
                Loading…
              </iframe>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackModal;