import React, { useEffect, useRef, useState, MouseEvent } from "react";
import { useSprings, useSpring, animated } from "@react-spring/web";
import { useGesture } from "@use-gesture/react";
import { RemoveScroll } from "react-remove-scroll";
import FocusLock from "react-focus-lock";
import { BUTTON_STYLE, DIALOG_STYLE, IMAGE_STYLE, SLIDE_STYLE } from "./styles";
import { ImageOpts } from "./useImageViewer";

interface Props {
  images: Array<[string, ImageOpts | undefined]>;
  defaultIndex?: number;
  onClose(): void;
}

export default function ImageViewer({ images, defaultIndex, onClose }: Props) {
  // Keep track of the currently active image index.
  const [index, setIndex] = useState(
    clamp(defaultIndex ?? 0, 0, images.length - 1)
  );

  // Track whether the close animation is running. This is used to disable any interactions.
  const [isClosing, setClosing] = useState(false);

  // Make sure the index is never out of bounds if `images` changes.
  useEffect(() => {
    setIndex(clamp(index, 0, images.length - 1));
  }, [images]);

  // The current modality the image viewer is in.
  const mode = useRef<null | "dismiss" | "startSlide" | "slide" | "pinch">(
    null
  );

  // Keep track of previous position changes when lifting fingers in between pinching and panning
  // an image.
  const offset = useRef<[number, number]>([0, 0]);

  // Keep track of the window size (and changes to it).
  const [[windowWidth, windowHeight], setWindowSize] = useState([
    window.innerWidth,
    window.innerHeight,
  ]);
  useEffect(() => {
    function handleResize() {
      setWindowSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // The animation for the black backdrop behind the image viewer. Used to fade the backdrop in and
  // out.
  const [backdropProps, backdropApi] = useSpring(() => ({
    backgroundColor: "rgba(0, 0, 0, 0)",
  }));

  // The animation for all control buttons (close, next, prev). Used to hide them on enter, exit and
  // while in `pinch` mode.
  const [buttonProps, buttonApi] = useSpring(() => ({
    display: "none",
  }));

  // The animations for all images.
  const [props, api] = useSprings(images.length, (i) => ({
    h: horizontalPosition(i, index, windowWidth),
    x: 0,
    y: 0,
    // Prepare the enter animation of the active image.
    scale: i === index ? 0.2 : 1,
    opacity: i === index ? 0 : 1,
    display: i === index ? "flex" : "none",
  }));

  // Kick off the enter animation once the viewer is first rendered.
  useEffect(() => {
    // Fly in the currently active image.
    // TODO: wait for the image being loaded?
    api.start((i) => {
      if (i === index) {
        return {
          opacity: 1,
          scale: 1,
        };
      }
    });

    // Fade the backdrop to black.
    backdropApi.start({
      backgroundColor: `rgba(0, 0, 0, 1)`,
    });

    // Show the control buttons.
    buttonApi.start({
      display: "flex",
    });
  }, []);

  // Slide to the active image once `index` changed. Necessary for the prev and next buttons.
  useEffect(() => {
    mode.current = null;

    api.start((i) => {
      // Hide all images except the active one and the two next to it.
      if (i < index - 1 || i > index + 1) {
        return { display: "none" };
      }

      return {
        h: horizontalPosition(i, index, windowWidth),
        x: 0,
        y: 0,
        scale: 1,
        display: "flex",
      };
    });
  }, [index]);

  // Close the image viewer (awaits the exit animation before actually closing the viewer).
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

    // Fade backdrop out.
    backdropApi.start({
      backgroundColor: `rgba(0, 0, 0, 0)`,
    });

    // Hide the control buttons.
    buttonApi.start({
      display: "none",
    });
  }

  function nextImage() {
    setIndex((index) => clamp(index + 1, 0, images.length - 1));
  }

  function previousImage() {
    setIndex((index) => clamp(index - 1, 0, images.length - 1));
  }

  // Close image viewer when Escape is pressed.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.code) {
        case "Escape":
          close();
          break;

        case "ArrowLeft":
          previousImage();
          break;

        case "ArrowRight":
          nextImage();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function startPinch() {
    mode.current = "pinch";
    // Hide the buttons while pinching.
    buttonApi.start({ display: "none" });
  }

  function stopPinch() {
    // When the image is reset back to the center and initial scale, also end the `pinch` mode.
    offset.current = [0, 0];
    mode.current = null;

    // Show the buttons again.
    buttonApi.start({ display: "flex" });
  }

  function handleDoubleClick(e: MouseEvent) {
    if (isClosing) {
      return;
    }

    const img = e.target as HTMLImageElement;
    if (!(img instanceof HTMLImageElement)) {
      console.warn("Expected double tap target to be an image");
      return;
    }

    api.start((i, ctrl) => {
      if (i !== index) {
        return;
      }

      if (mode.current === "pinch") {
        stopPinch();
        return { scale: 1, x: 0, y: 0 };
      } else {
        // Scale the image to its actual size.
        const newScale = img.naturalWidth / img.width;
        if (newScale < 1.0) {
          // No need to scale if the image is smaller than the screen size.
          return;
        }

        // Calculate the image movement to zoom at the location the user tapped clicked at.
        const originOffsetX = e.pageX - (windowWidth / 2 + offset.current[0]);
        const originOffsetY = e.pageY - (windowHeight / 2 + offset.current[1]);

        const scale = ctrl.get().scale;
        const refX = originOffsetX / scale;
        const refY = originOffsetY / scale;

        const transformOriginX = refX * newScale - originOffsetX;
        const transformOriginY = refY * newScale - originOffsetY;

        offset.current[0] -= transformOriginX;
        offset.current[1] -= transformOriginY;

        startPinch();

        return {
          scale: newScale,
          x: offset.current[0],
          y: offset.current[1],
        };
      }
    });
  }

  // Setup all gestures.
  const bind = useGesture(
    {
      onDrag({ last, active, movement: [mx, my], cancel, swipe, pinching }) {
        // When pinching, the `onPinch` handles moving the image around.
        if (pinching) {
          cancel();
          return;
        }

        // Determine the current mode based on the drag amount and direction.
        if (mode.current === null) {
          mode.current = deriveMode(mx, my);
        }
        // Transition to the `slide` mode once the user dragged the image more than 16px into any
        // direction. This gives the user some slack to start the `pinch` mode instead.
        else if (
          mode.current === "startSlide" &&
          (Math.abs(mx) > 16 || Math.abs(my) > 16)
        ) {
          mode.current = "slide";
        }

        let newIndex = index;
        switch (mode.current) {
          case "startSlide":
          case "slide":
            // Change index on horizontal swipes.
            if (swipe[0] !== 0) {
              newIndex = clamp(index - swipe[0], 0, images.length - 1);
              setIndex(newIndex);
            }
            // Change index if this is the drag end (last) and the image was moved past half the
            // screen width.
            else if (last && Math.abs(mx) > windowWidth / 2) {
              newIndex = clamp(index + (mx > 0 ? -1 : 1), 0, images.length - 1);
              setIndex(newIndex);
            }

            break;

          case "dismiss":
            // Close the image viewer is the image got released after dragging it at least 10% down.
            if (last && my > 0 && my / windowHeight > 0.1) {
              close();
              return;
            }
            // Fade out the backdrop depending on the drag distance otherwise.
            else {
              backdropApi.start({
                backgroundColor: `rgba(0, 0, 0, ${Math.max(
                  0,
                  1 - (Math.abs(my) / windowHeight) * 2
                )})`,
              });
            }

            break;
        }

        // Update the animation state of all images.
        api.start((i) => {
          // Hide all except the active image, unless a slide mode is active where the immediately
          // next and previous image are also shown.
          const boundary =
            mode.current === "startSlide" || mode.current === "slide" ? 1 : 0;
          if (i < newIndex - boundary || i > newIndex + boundary) {
            return { display: "none" };
          }

          // Calculate the new horizontal position.
          const h =
            horizontalPosition(i, newIndex, windowWidth) + (active ? mx : 0);

          switch (mode.current) {
            // When sliding, mainly update the horizontal position.
            case "startSlide":
            case "slide":
              return { h, y: 0, display: "flex", immediate: active };

            // While dismissing (sliding down), animate both the position and scale (scale down)
            // depending on how far the image is dragged away from the center.
            case "dismiss":
              const y = active ? my : 0;
              const scale = active
                ? Math.max(1 - Math.abs(my) / windowHeight / 2, 0.8)
                : 1;
              return { h, y, scale, display: "flex", immediate: active };

            // When lifting a pinch and continuing to track the image with one touch point, animate
            // the position of the image accordingly.
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
            // Keep track of the current drag position. Don't reset the mode so that the user can
            // continue dragging the image with another drag or pinch gesture.
            offset.current = [offset.current[0] + mx, offset.current[1] + my];
          } else {
            // Reset the mode.
            mode.current = null;
          }

          // Reset the backdrop back to being fully black.
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
        // The pinch mode can only be initiated from no active mode, while starting to slide, or by
        // continuing and still active pinch.
        if (
          mode.current !== null &&
          mode.current !== "startSlide" &&
          mode.current !== "pinch"
        ) {
          cancel();
          return;
        }

        if (mode.current !== "pinch") {
          startPinch();
        }

        // Keep track of the offset when first starting to pinch.
        if (first || !memo) {
          // This is the offset between the image's origin (in its center) and the pinch origin.
          const originOffsetX = ox - (windowWidth / 2 + offset.current[0]);
          const originOffsetY = oy - (windowHeight / 2 + offset.current[1]);

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

        // Calculate the current drag x and y movements taking the pinch origin into account (when
        // pinching outside of the center of the image, the image needs to be moved accordingly to
        // scale below the pinch origin).
        const transformOriginX = memo.offset.refX * scale - memo.offset.x;
        const transformOriginY = memo.offset.refY * scale - memo.offset.y;
        const mx = ox - memo.origin.x - transformOriginX;
        const my = oy - memo.origin.y - transformOriginY;

        // Update the animation state of all images.
        api.start((i) => {
          if (i !== index) {
            return;
          }

          // If the user stopped the pinch gesture and the scale is below 110%, reset the image back
          // to the center and to fit the screen.
          if (last && scale <= 1.1) {
            return {
              x: 0,
              y: 0,
              scale: 1,
            };
          }
          // Otherwise, update the scale and position of the image accordingly.
          else {
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
            stopPinch();
          } else {
            // Keep track of the current drag position so that the user can continue manipulating
            // the current position in a follow-up drag or pinch.
            offset.current = [offset.current[0] + mx, offset.current[1] + my];
          }
        }

        return memo;
      },
    },
    {
      drag: {
        enabled: !isClosing,
      },
      pinch: {
        enabled: !isClosing,
        scaleBounds: { min: 1.0, max: Infinity },
        from: () => [api.current[index].get().scale, 0],
      },
    }
  );

  return (
    <FocusLock autoFocus returnFocus>
      <RemoveScroll>
        <animated.div
          role="dialog"
          aria-label="image viewer"
          style={{
            ...DIALOG_STYLE,
            ...backdropProps,
          }}
          onDoubleClick={handleDoubleClick}
        >
          {props.map(({ h, x, y, scale, opacity, display }, i) => (
            <animated.div
              {...bind()}
              key={i}
              style={{
                ...SLIDE_STYLE,
                display,
                x: h,
              }}
            >
              <picture>
                {Object.entries(images[i][1]?.sources ?? {}).map(
                  ([type, srcSet]) => (
                    <source type={type} srcSet={srcSet} />
                  )
                )}

                <animated.img
                  style={{
                    ...IMAGE_STYLE,
                    x: x,
                    y: y,
                    scale,
                    opacity,
                  }}
                  loading={Math.abs(index - i) > 1 ? "lazy" : "eager"}
                  src={images[i][0]}
                  draggable={false}
                />
              </picture>
            </animated.div>
          ))}
        </animated.div>

        <animated.button
          aria-label="close image viewer"
          style={{
            ...BUTTON_STYLE,
            ...buttonProps,
            width: 40,
            top: 16,
            right: 16,
          }}
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
        </animated.button>

        {index > 0 && (
          <animated.button
            aria-label="previous image"
            style={{
              ...BUTTON_STYLE,
              ...buttonProps,
              top: "50%",
              width: 24,
              left: 16,
              marginTop: -20,
            }}
            onClick={previousImage}
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
          </animated.button>
        )}

        {index < images.length - 1 && (
          <animated.button
            aria-label="next image"
            style={{
              ...BUTTON_STYLE,
              ...buttonProps,
              top: "50%",
              width: 24,
              right: 16,
              marginTop: -20,
            }}
            onClick={nextImage}
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
          </animated.button>
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
