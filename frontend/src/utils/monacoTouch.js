export function setupMonacoTouch(editor, monaco, setFontSize) {
  const dom = editor.getDomNode();
  if (!dom) return () => {};

  let pinchRef = null;
  let panRef = null;

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef = Math.hypot(dx, dy);
      panRef = null; // stop pan
    } else if (e.touches.length === 1) {
      panRef = {
        y: e.touches[0].clientY,
        x: e.touches[0].clientX,
        scrollTop: editor.getScrollTop(),
        scrollLeft: editor.getScrollLeft(),
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef !== null) {
      e.preventDefault();
      e.stopPropagation();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const delta = (newDist - pinchRef) / 40;
      pinchRef = newDist;
      
      setFontSize(prev => {
        const next = Math.min(24, Math.max(8, prev + delta));
        editor.updateOptions({ fontSize: next });
        return next;
      });
    } else if (e.touches.length === 1 && panRef !== null) {
      // Single finger pan
      e.preventDefault();
      e.stopPropagation();
      const dy = e.touches[0].clientY - panRef.y;
      const dx = e.touches[0].clientX - panRef.x;
      
      // Update scroll without firing Monaco's selection logic
      editor.setScrollTop(panRef.scrollTop - dy);
      editor.setScrollLeft(panRef.scrollLeft - dx);
    }
  };

  const handleTouchEnd = () => {
    pinchRef = null;
    panRef = null;
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setFontSize(prev => {
        const next = Math.min(24, Math.max(8, prev + (e.deltaY < 0 ? 1 : -1)));
        editor.updateOptions({ fontSize: next });
        return next;
      });
    }
  };

  dom.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
  dom.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
  dom.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
  dom.addEventListener('wheel', handleWheel, { passive: false, capture: true });

  const configListener = editor.onDidChangeConfiguration(() => {
    // keep state in sync if changed by other means
    const size = editor.getOption(monaco.editor.EditorOption.fontSize);
    setFontSize(Math.round(size));
  });

  return () => {
    dom.removeEventListener('touchstart', handleTouchStart, { capture: true });
    dom.removeEventListener('touchmove', handleTouchMove, { capture: true });
    dom.removeEventListener('touchend', handleTouchEnd, { capture: true });
    dom.removeEventListener('wheel', handleWheel, { capture: true });
    configListener.dispose();
  };
}
