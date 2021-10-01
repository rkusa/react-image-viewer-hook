import React, {
  Dispatch,
  MouseEventHandler,
  SetStateAction,
  useCallback,
  useRef,
  useState,
  lazy,
  ReactNode,
  Suspense,
} from "react";

const LazyImageViewer = lazy(() => import("./ImageViewer"));

export function useImageViewer() {
  const images = useRef<Array<string>>([]);
  images.current.length = 0;

  const setOpens: Array<Dispatch<SetStateAction<undefined | number>>> = [];

  const ImageViewer = useCallback(function ImageViewer({
    fallback,
  }: {
    fallback?: ReactNode;
  }) {
    const [isOpen, setOpen] = useState<undefined | number>(undefined);
    setOpens.push(setOpen);

    const handleClose = useCallback(() => setOpen(undefined), []);

    if (isOpen === undefined || typeof window === "undefined") {
      return null;
    }

    return (
      <Suspense fallback={fallback ?? null}>
        <LazyImageViewer
          images={images.current}
          onClose={handleClose}
          defaultIndex={isOpen}
        />
      </Suspense>
    );
  },
  []);

  return {
    getOnClick(url?: string): MouseEventHandler {
      const index = images.current.length;
      if (url) {
        images.current.push(url);
      }

      return (e) => {
        e.preventDefault();

        for (const setOpen of setOpens) {
          setOpen(index);
        }
      };
    },

    ImageViewer,
  };
}
