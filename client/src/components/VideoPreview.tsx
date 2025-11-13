import useTranslate from '../hooks/useTranslate';

interface VideoPreviewProps {
  src?: string | null;
  title: string;
  variant?: 'inline' | 'icon';
}

const VideoPreview = ({ src, title, variant = 'inline' }: VideoPreviewProps) => {
  const { language, t } = useTranslate();

  if (!src) {
    return <span className="video-placeholder">{t('No video', 'لا يوجد فيديو')}</span>;
  }

  const openInlineModal = () => {
    const overlay = document.createElement('dialog');
    overlay.className = 'video-modal';

    const container = document.createElement('div');
    container.className = 'video-modal__content';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'video-modal__close';
    closeButton.innerText = '×';
    closeButton.setAttribute('aria-label', 'Close video');

    const video = document.createElement('video');
    video.src = src;
    video.title = title;
    video.controls = true;
    video.autoplay = true;
    video.className = 'video-modal__player';

    const closeOverlay = () => {
      video.pause();
      overlay.close();
      overlay.remove();
    };

    closeButton.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeOverlay();
      }
    });
    overlay.addEventListener('cancel', closeOverlay);

    container.appendChild(closeButton);
    container.appendChild(video);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    overlay.showModal();
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className="video-button video-button--icon"
        onClick={openInlineModal}
        aria-label={language === 'ar'
          ? `تشغيل فيديو ${title}`
          : `Play ${title} video`}
      >
        <span aria-hidden="true">▶</span>
      </button>
    );
  }

  return (
    <div className="video-preview">
      <video className="video-player" controls preload="metadata">
        <source src={src} title={title} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPreview;




