interface VideoPreviewProps {
  src?: string | null;
  title: string;
}

const VideoPreview = ({ src, title }: VideoPreviewProps) => {
  if (!src) {
    return <span className="video-placeholder">No video</span>;
  }

  return (
    <video className="video-player" controls preload="metadata">
      <source src={src} title={title} />
      Your browser does not support the video tag.
    </video>
  );
};

export default VideoPreview;




