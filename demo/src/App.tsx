import { useImageViewer } from "../../src/useImageViewer";

const IMAGES = [
  "https://images.pexels.com/photos/374631/pexels-photo-374631.jpeg",
  "https://images.pexels.com/photos/416682/pexels-photo-416682.jpeg",
  "https://images.pexels.com/photos/545580/pexels-photo-545580.jpeg",
];

export default function App() {
  const { getOnClick, ImageViewer } = useImageViewer();

  return (
    <>
      <div className="gallery">
        {IMAGES.map((src) => (
          <a
            key={src}
            href={`${src}?auto=compress&cs=tinysrgb&w=1200`}
            onClick={getOnClick(`${src}?auto=compress&cs=tinysrgb&w=1200`)}
          >
            <img src={`${src}?auto=compress&cs=tinysrgb&w=300`} />
          </a>
        ))}
      </div>

      <ImageViewer />
    </>
  );
}
