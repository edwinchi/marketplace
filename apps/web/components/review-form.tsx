"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReview, type ReviewFormState } from "@/app/experiences/leave-review/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const POSITIVE_TAGS = [
  "Responds quickly",
  "Friendly",
  "Keeps appointments",
  "Attentive",
  "Pays quickly",
  "Realistic offers",
  "On time",
];

const initialState: ReviewFormState = { error: null };

export function ReviewForm({ revieweeId }: { revieweeId: string }) {
  const [state, formAction, pending] = useActionState(submitReview, initialState);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="reviewee_id" value={revieweeId} />
          <input type="hidden" name="rating" value={rating} />
          {tags.map((tag) => (
            <input key={tag} type="hidden" name="tag" value={tag} />
          ))}

          <div className="flex flex-col gap-1.5">
            <Label>Rating</Label>
            <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  className="p-0.5"
                >
                  <Star className={`size-7 transition-colors ${n <= (hoverRating || rating) ? "fill-primary text-primary" : "text-muted"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>What stood out? (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {POSITIVE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    tags.includes(tag) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea id="comment" name="comment" rows={3} maxLength={1000} />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending || rating === 0}>
            {pending ? "Submitting…" : "Submit review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
