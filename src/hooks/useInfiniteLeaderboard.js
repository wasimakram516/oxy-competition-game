"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const LEADERBOARD_PAGE_SIZE = 20;
const LEADERBOARD_SCROLL_THRESHOLD_PX = 24;

export default function useInfiniteLeaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [isLeadersLoading, setIsLeadersLoading] = useState(false);
  const [hasMoreLeaders, setHasMoreLeaders] = useState(true);

  const leaderboardContainerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);

  const loadMoreLeaders = useCallback(
    async ({ reset = false } = {}) => {
      if (isFetchingRef.current) {
        return;
      }
      if (!reset && !hasMoreRef.current) {
        return;
      }

      isFetchingRef.current = true;
      setIsLeadersLoading(true);

      const offset = reset ? 0 : offsetRef.current;

      try {
        const response = await fetch(
          `/api/leaderboard?limit=${LEADERBOARD_PAGE_SIZE}&offset=${offset}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard");
        }

        const data = await response.json();
        const nextBatch = Array.isArray(data?.leaderboard) ? data.leaderboard : [];
        const nextHasMore =
          typeof data?.pagination?.hasMore === "boolean"
            ? data.pagination.hasMore
            : nextBatch.length === LEADERBOARD_PAGE_SIZE;

        if (!isMountedRef.current) {
          return;
        }

        if (reset) {
          offsetRef.current = nextBatch.length;
          setLeaders(nextBatch);
        } else {
          offsetRef.current += nextBatch.length;
          setLeaders((prev) => [...prev, ...nextBatch]);
        }

        hasMoreRef.current = nextHasMore;
        setHasMoreLeaders(nextHasMore);
      } catch {
        if (!isMountedRef.current) {
          return;
        }
        if (reset) {
          setLeaders([]);
          offsetRef.current = 0;
        }
        hasMoreRef.current = false;
        setHasMoreLeaders(false);
      } finally {
        isFetchingRef.current = false;
        if (isMountedRef.current) {
          setIsLeadersLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    isMountedRef.current = true;
    hasMoreRef.current = true;
    void loadMoreLeaders({ reset: true });

    return () => {
      isMountedRef.current = false;
    };
  }, [loadMoreLeaders]);

  useEffect(() => {
    const container = leaderboardContainerRef.current;
    if (!container || isLeadersLoading || !hasMoreLeaders) {
      return;
    }

    if (container.scrollHeight <= container.clientHeight + 2) {
      void loadMoreLeaders();
    }
  }, [leaders.length, isLeadersLoading, hasMoreLeaders, loadMoreLeaders]);

  const handleLeaderboardScroll = useCallback(
    (event) => {
      const container = event.currentTarget;
      const isNearBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - LEADERBOARD_SCROLL_THRESHOLD_PX;

      if (isNearBottom) {
        void loadMoreLeaders();
      }
    },
    [loadMoreLeaders]
  );

  return {
    leaders,
    isLeadersLoading,
    hasMoreLeaders,
    leaderboardContainerRef,
    handleLeaderboardScroll,
  };
}
