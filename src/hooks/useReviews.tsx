import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Review = {
  id: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
  comment: string;
  ratings: Record<string, number>;
  helpful_count: number;
  is_verified: boolean;
};

type ReviewStats = {
  average_rating: number;
  total_reviews: number;
};

export function useReviews(listingId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ average_rating: 0, total_reviews: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      type ReviewRow = Database['public']['Tables']['listing_reviews']['Row'];
      const { data, error } = await supabase
        .from("listing_reviews")
        .select(`id, comment, ratings, helpful_count, is_verified, created_at, user_id`)
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42P01") {
          console.warn("listing_reviews table not found. Run DASHBOARD_RUN_THIS.sql first.");
        } else {
          console.error("Failed to fetch reviews:", error);
          toast({ title: "Failed to load reviews", variant: "destructive" });
        }
        setReviews([]);
        setLoading(false);
        return;
      }

      const rows = (data || []) as ReviewRow[];
      const userIds = [...new Set(rows.map((r) => r.user_id))] as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("public_profiles")
          .select("id, name, photo_url")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        setReviews(
          rows.map((r) => ({
            ...r,
            user_name: profileMap.get(r.user_id)?.name || "Anonymous",
            user_avatar: profileMap.get(r.user_id)?.photo_url,
          }))
        );
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      toast({ title: "Failed to load reviews", variant: "destructive" });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [listingId, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("calculate_listing_rating", {
        listing_uuid: listingId,
      });

      if (error) {
        console.warn("calculate_listing_rating unavailable:", error.message);
        return;
      }
      const rows = data as Array<{ average_rating: number; total_reviews: number }> | null;
      if (rows && Array.isArray(rows) && rows.length > 0) {
        setStats({
          average_rating: Number(rows[0].average_rating) || 0,
          total_reviews: Number(rows[0].total_reviews) || 0,
        });
      }
    } catch (error) {
      console.warn("Failed to fetch review stats:", error);
    }
  }, [listingId]);

  const submitReview = useCallback(
    async (ratings: Record<string, number>, comment: string) => {
      if (!user) {
        toast({ title: "Please sign in to leave a review", variant: "destructive" });
        return false;
      }

      // Validation
      if (Object.keys(ratings).length === 0) {
        toast({ title: "Please provide ratings", variant: "destructive" });
        return false;
      }

      const trimmedComment = comment.trim();
      if (trimmedComment.length < 10) {
        toast({ title: "Please write at least 10 characters", variant: "destructive" });
        return false;
      }
      if (trimmedComment.length > 1000) {
        toast({ title: "Review is too long (max 1000 characters)", variant: "destructive" });
        return false;
      }

      setSubmitting(true);
      try {
        const { error } = await supabase.from("listing_reviews").insert({
          listing_id: listingId,
          user_id: user.id,
          ratings,
          comment: trimmedComment,
        });

        if (error) throw error;

        toast({ title: "Review submitted successfully!" });

        await Promise.all([fetchReviews(), fetchStats()]);

        return true;
      } catch (error) {
        console.error("Review submission error:", error);
        const err = error as { code?: string; message?: string } | Error | unknown;
        if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
          toast({ title: "You've already reviewed this listing", variant: "destructive" });
        } else if (error instanceof Error && error.message?.includes("rate limit")) {
          toast({ title: "Too many reviews", description: "Maximum 5 reviews per day", variant: "destructive" });
        } else {
          toast({ title: "Failed to submit review", variant: "destructive" });
        }
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [user, listingId, toast, fetchReviews, fetchStats]
  );

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [fetchReviews, fetchStats]);

  return {
    reviews,
    stats,
    loading,
    submitting,
    submitReview,
    refetch: fetchReviews,
  };
}
