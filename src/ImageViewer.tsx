import React, {
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
  CSSProperties,
} from "react";
import { useSprings, useSpring, animated } from "@react-spring/web";
import { useGesture } from "@use-gesture/react";
import { RemoveScroll } from "react-remove-scroll";
import FocusLock from "react-focus-lock";

interface Props {
  images: Array<string>;
  defaultIndex?: number;
  onClose(): void;
}

const BUTTON_STYLE: CSSProperties = {
  position: "fixed",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  border: "none",
  color: "white",
  borderRadius: 4,
  display: "flex",
  height: 40,
  justifyContent: "center",
  alignItems: "center",
  padding: 0,
};

export default function ImageViewer({ images, defaultIndex, onClose }: Props) {
  const [index, setIndex] = useState(
    clamp(defaultIndex ?? 0, 0, images.length)
  );
  useEffect(() => {
    setIndex(clamp(index, 0, images.length));
  }, [images]);
  const mode = useRef<null | "dismiss" | "startSlide" | "slide" | "pinch">(
    null
  );
  const offset = useRef<[number, number]>([0, 0]);
  const [isPinching, setPinching] = useState(false);

  const width = window.innerWidth;
  const height = window.innerHeight;

  const [backdropProps, backdropApi] = useSpring(() => ({
    backgroundColor: "rgba(0, 0, 0, 0)",
  }));
  const [props, api] = useSprings(images.length, (i) => ({
    h: horizontalPosition(i, index, width),
    x: 0,
    y: 0,
    scale: i === index ? 0.2 : 1,
    opacity: i === index ? 0 : 1,
    display: i === index ? "flex" : "none",
  }));

  // enter animation
  // TODO: wait for image being loaded?
  useEffect(() => {
    api.start((i) => {
      if (i === index) {
        return {
          opacity: 1,
          scale: 1,
        };
      }
    });

    backdropApi.start({
      backgroundColor: `rgba(0, 0, 0, 1)`,
    });
  }, []);

  useEffect(() => {
    mode.current = null;
    setPinching(false);

    api.start((i) => {
      if (i < index - 1 || i > index + 1) {
        return { display: "none" };
      }

      return {
        h: horizontalPosition(i, index, width),
        x: 0,
        y: 0,
        scale: 1,
        display: "flex",
      };
    });
  }, [index, api]);

  const [isClosing, setClosing] = useState(false);
  function close() {
    if (isClosing) {
      return;
    }

    setClosing(true);

    api.start((i) => {
      if (i !== index) {
        return;
      }

      return {
        opacity: 0,
        scale: 0.2,
        x: 0,
        y: 0,
        sx: 0,
        sy: 0,
        onRest: onClose,
      };
    });

    backdropApi.start({
      backgroundColor: `rgba(0, 0, 0, 0)`,
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      close();
    }
  }

  const bind = useGesture(
    {
      onDrag({ last, active, movement: [mx, my], cancel, swipe, pinching }) {
        if (pinching) {
          cancel();
          return;
        }

        if (mode.current === null) {
          mode.current = deriveMode(mx, my);
        } else if (
          mode.current === "startSlide" &&
          (Math.abs(mx) > 16 || Math.abs(my) > 16)
        ) {
          mode.current = "slide";
        }

        let newIndex = index;
        switch (mode.current) {
          case "startSlide":
          case "slide":
            if (swipe[0] !== 0) {
              newIndex = clamp(index - swipe[0], 0, images.length - 1);
              setIndex(newIndex);
            } else if (last && Math.abs(mx) > width / 2) {
              newIndex = clamp(index + (mx > 0 ? -1 : 1), 0, images.length - 1);
              setIndex(newIndex);
            }

            break;

          case "dismiss":
            if (last && my > 0 && my / height > 0.1) {
              close();
              return;
            } else {
              backdropApi.start({
                backgroundColor: `rgba(0, 0, 0, ${Math.max(
                  0,
                  1 - (Math.abs(my) / height) * 2
                )})`,
              });
            }

            break;
        }

        api.start((i) => {
          const boundary =
            mode.current === "startSlide" || mode.current === "slide" ? 1 : 0;
          if (i < newIndex - boundary || i > newIndex + boundary) {
            return { display: "none" };
          }

          const x = horizontalPosition(i, newIndex, width) + (active ? mx : 0);

          switch (mode.current) {
            case "startSlide":
            case "slide":
              return { h: x, y: 0, display: "flex", immediate: active };

            case "dismiss":
              const y = active ? my : 0;
              const scale = active
                ? Math.max(1 - Math.abs(my) / height / 2, 0.8)
                : 1;
              return { h: x, y, scale, display: "flex", immediate: active };

            case "pinch":
              return {
                x: offset.current[0] + mx,
                y: offset.current[1] + my,
                display: "flex",
                immediate: active,
              };
          }
        });

        if (last) {
          if (mode.current === "pinch") {
            offset.current = [offset.current[0] + mx, offset.current[1] + my];
          } else {
            mode.current = null;
          }
          backdropApi.start({ backgroundColor: "rgba(0, 0, 0, 1)" });
        }
      },

      onPinch({
        origin: [ox, oy],
        first,
        last,
        offset: [scale],
        memo,
        cancel,
      }) {
        if (
          mode.current !== null &&
          mode.current !== "startSlide" &&
          mode.current !== "pinch"
        ) {
          cancel();
          return;
        }

        if (mode.current !== "pinch") {
          mode.current = "pinch";
          setPinching(true);
        }

        if (first) {
          const originOffsetX = ox - (width / 2 + offset.current[0]);
          const originOffsetY = oy - (height / 2 + offset.current[1]);

          memo = {
            origin: {
              x: ox,
              y: oy,
            },
            offset: {
              refX: originOffsetX / scale,
              refY: originOffsetY / scale,
              x: originOffsetX,
              y: originOffsetY,
            },
          };
        }

        const transformOriginX = memo.offset.refX * scale - memo.offset.x;
        const transformOriginY = memo.offset.refY * scale - memo.offset.y;

        const mx = ox - memo.origin.x - transformOriginX;
        const my = oy - memo.origin.y - transformOriginY;

        api.start((i) => {
          if (i !== index) {
            return;
          }

          if (last && scale <= 1.1) {
            return {
              x: 0,
              y: 0,
              scale: 1,
            };
          } else {
            return {
              h: 0,
              scale,
              x: offset.current[0] + mx,
              y: offset.current[1] + my,
              immediate: true,
            };
          }
        });

        if (last) {
          if (scale <= 1.1) {
            offset.current = [0, 0];
            mode.current = null;
            setPinching(false);
          } else {
            offset.current = [offset.current[0] + mx, offset.current[1] + my];
          }
        }

        return memo;
      },
    },
    {
      pinch: {
        scaleBounds: { min: 1.0, max: Infinity },
      },
    }
  );

  return (
    <FocusLock autoFocus returnFocus>
      <RemoveScroll>
        <animated.div
          role="dialog"
          aria-label="image viewer"
          onKeyDown={handleKeyDown}
          style={{
            position: "fixed",
            width: "100vw",
            height: "100vh",
            backgroundColor: backdropProps.backgroundColor,
            top: 0,
            left: 0,
            display: "flex",
            overflow: "hidden",
            marginRight: 32,
          }}
        >
          {props.map(({ h, x, y, scale, opacity, display }, i) => (
            <animated.div
              {...bind()}
              key={i}
              style={{
                display,
                x: h,
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
                flexShrink: 0,
                position: "absolute",
                justifyContent: "center",
                alignItems: "center",
                touchAction: "none",
              }}
            >
              <animated.img
                style={{
                  x: x,
                  y: y,
                  scale,
                  opacity,
                  touchAction: "none",
                  userSelect: "none",
                  maxWidth: "100vw",
                  maxHeight: "100vh",
                }}
                src={images[i]}
                draggable={false}
              />
            </animated.div>
          ))}
        </animated.div>

        {!isClosing && !isPinching && (
          <>
            <button
              aria-label="close image viewer"
              style={{ ...BUTTON_STYLE, width: 40, top: 16, right: 16 }}
              onClick={close}
            >
              <svg
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M17.25 6.75L6.75 17.25"
                ></path>
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M6.75 6.75L17.25 17.25"
                ></path>
              </svg>
            </button>

            {index > 0 && (
              <button
                aria-label="previous image"
                style={{
                  ...BUTTON_STYLE,
                  top: "50%",
                  width: 24,
                  left: 16,
                  marginTop: -20,
                }}
                onClick={() => setIndex((index) => index - 1)}
              >
                <svg
                  width="18"
                  height="24"
                  fill="none"
                  viewBox="0 0 18 24"
                  aria-hidden="true"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M13.696,20.721l-9.392,-8.721l9.392,-8.721"
                  ></path>
                </svg>
              </button>
            )}

            {index < images.length - 1 && (
              <button
                aria-label="next image"
                style={{
                  ...BUTTON_STYLE,
                  top: "50%",
                  width: 24,
                  right: 16,
                  marginTop: -20,
                }}
                onClick={() => setIndex((index) => index + 1)}
              >
                <svg
                  width="18"
                  height="24"
                  fill="none"
                  viewBox="0 0 18 24"
                  aria-hidden="true"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M4.304,3.279l9.392,8.721l-9.392,8.721"
                  ></path>
                </svg>
              </button>
            )}
          </>
        )}
      </RemoveScroll>
    </FocusLock>
  );
}

function deriveMode(mx: number, my: number): "startSlide" | "dismiss" | null {
  if (mx === 0 && my === 0) {
    return null;
  }

  if (my > 0 && my > Math.abs(mx)) {
    return "dismiss";
  }

  return "startSlide";
}

function clamp(n: number, l: number, h: number): number {
  if (n < l) {
    return l;
  }
  if (n > h) {
    return h;
  }
  return n;
}

function horizontalPosition(
  itemIndex: number,
  activeIndex: number,
  width: number
) {
  return (itemIndex - activeIndex) * (width + 32); /* 32px gap between images */
}
