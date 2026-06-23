import { useCallback, useEffect, useRef, RefObject } from "react";

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T>,
  RefObject<T>
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  const shouldStickToBottomRef = useRef(true);

  const isNearBottom = useCallback((container: T) => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < 140;
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;

    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      scrollToBottom();

      const handleScroll = () => {
        shouldStickToBottomRef.current = isNearBottom(container);
      };

      container.addEventListener("scroll", handleScroll, { passive: true });

      const observer = new MutationObserver(() => {
        if (shouldStickToBottomRef.current) {
          scrollToBottom();
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      const resizeObserver = new ResizeObserver(() => {
        if (shouldStickToBottomRef.current) {
          scrollToBottom();
        }
      });

      resizeObserver.observe(container);
      resizeObserver.observe(end);

      return () => {
        container.removeEventListener("scroll", handleScroll);
        observer.disconnect();
        resizeObserver.disconnect();
      };
    }
  }, [isNearBottom, scrollToBottom]);

  return [containerRef, endRef];
}
