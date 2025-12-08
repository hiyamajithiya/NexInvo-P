/**
 * Custom hook to track if a component is mounted.
 * Use this to prevent state updates on unmounted components,
 * which can cause memory leaks.
 * 
 * Usage:
 * const isMounted = useIsMounted();
 * 
 * useEffect(() => {
 *   async function fetchData() {
 *     const result = await api.getData();
 *     if (isMounted()) {
 *       setData(result);
 *     }
 *   }
 *   fetchData();
 * }, [isMounted]);
 */
import { useRef, useEffect, useCallback } from 'react';

export function useIsMounted() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * Custom hook to create an AbortController for cancelling fetch requests.
 * Returns a new AbortController that is automatically aborted on unmount.
 * 
 * Usage:
 * const getAbortController = useAbortController();
 * 
 * useEffect(() => {
 *   const controller = getAbortController();
 *   fetch(url, { signal: controller.signal })
 *     .then(res => res.json())
 *     .then(data => setData(data))
 *     .catch(err => {
 *       if (err.name !== 'AbortError') console.error(err);
 *     });
 * }, [getAbortController]);
 */
export function useAbortController() {
  const controllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  return useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();
    return controllerRef.current;
  }, []);
}

export default useIsMounted;
